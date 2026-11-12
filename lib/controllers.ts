import { DbTypes, ProjectStatus, TaskPriority, TaskStatus, UserRole, EscalationLevel } from "./enums";
import { randomBytes } from "crypto";
import { currentUser, getPasswordHash, requireAdminOrAbove, requireProjectHeadOrAbove, requireSuperAdmin } from "./auth";
import { addDays, dateOnly, parseReportRange, startOfToday, timeOnly, toDateString, workingDaysInclusive } from "./dates";
import { fail, getClientIp, json, readBody } from "./http";
import { db, models } from "./data";
import {
  addProjectMemberSchema,
  adminResetPasswordSchema,
  broadcastSchema,
  changePasswordSchema,
  createMeetingSchema,
  createProjectSchema,
  createTaskSchema,
  createUserSchema,
  departmentSchema,
  eodCreateSchema,
  followUpSchema,
  loginSchema,
  taskStatusUpdateSchema,
  updateMeetingSchema,
  updateProjectSchema,
  updateTaskSchema,
  updateUserSchema
} from "./schemas/api";
import { serializeEod, serializeFollowUp, serializeMeeting, serializeProject, serializeTask, serializeUser } from "./serializers";
import { generateDailyTodo, generateMeetingSummary } from "./services/ai";
import {
  customWhatsAppMessage,
  dailySummaryMessage,
  eodReminderMessage,
  escalationToAdminMessage,
  meetingInviteMessage,
  newAccountMessage,
  sendWhatsAppMessage,
  taskAssignedMessage,
  taskDelayAlertMessage,
  taskReminderMessage
} from "./services/whatsapp";
import {
  jobCheckOverdueEscalation,
  jobDailyTodo,
  jobEodSummary,
  jobEveningReport,
  jobSendEodReminders,
  schedulerStatus
} from "./jobs/scheduler";
import { createAccessToken, verifyPassword } from "./auth";
import { settings } from "./config";

const userInclude = { department: true } satisfies DbTypes.UserInclude;
const projectInclude = { project_head: { select: { id: true, name: true } } } satisfies DbTypes.ProjectInclude;

export async function login(request: Request) {
  const body = await readBody(request, loginSchema);
  const user = await db.user.findFirst({ where: { phone: body.phone }, include: userInclude });
  if (!user || !(await verifyPassword(body.password, user.hashed_password))) fail(401, "Incorrect phone or password");
  if (!user.is_active) fail(400, "Account is deactivated");
  const token = await createAccessToken({ sub: String(user.id), role: user.role });
  await db.auditLog.create({
    data: { user_id: user.id, action: "login", module: "auth", ip_address: getClientIp(request) }
  });
  return json({ access_token: token, token_type: "bearer", user: serializeUser(user) });
}

export async function getMe(request: Request) {
  return json(serializeUser(await currentUser(request)));
}

export async function changePassword(request: Request) {
  const body = await readBody(request, changePasswordSchema);
  const user = await currentUser(request);
  if (!(await verifyPassword(body.old_password, user.hashed_password))) fail(400, "Old password is incorrect");
  await db.user.update({ where: { id: user.id }, data: { hashed_password: await getPasswordHash(body.new_password) } });
  return json({ message: "Password changed successfully" });
}

export async function createUser(request: Request) {
  const body = await readBody(request, createUserSchema);
  const actor = await requireAdminOrAbove(request);
  if (actor.role === UserRole.project_head && body.role !== UserRole.team_member) {
    fail(403, "Project Head can only create Team Members");
  }
  if (await db.user.findFirst({ where: { phone: body.phone } })) fail(400, "Phone number already registered");
  if (body.department_id) {
    const dept = await db.department.findUnique({ where: { id: body.department_id } });
    if (!dept) fail(404, `Department with id ${body.department_id} not found`);
  }
  const rawPassword = body.password ?? randomBytes(9).toString("base64url");
  const user = await db.user.create({
    data: {
      name: body.name,
      phone: body.phone,
      email: body.email,
      hashed_password: await getPasswordHash(rawPassword),
      role: body.role,
      department_id: body.department_id,
      created_by: actor.id
    },
    include: userInclude
  });
  const msg = newAccountMessage(user.name, user.phone, rawPassword, settings.PLATFORM_URL);
  await sendWhatsAppMessage(user.phone, msg.messageId, msg.variables);
  await db.auditLog.create({
    data: { user_id: actor.id, action: "user_created", module: "user", detail: { created_user_id: user.id, role: user.role } }
  });
  return json(serializeUser(user));
}

export async function listUsers(request: Request) {
  const actor = await requireAdminOrAbove(request);
  const url = new URL(request.url);
  const where: DbTypes.UserWhereInput = {};
  const role = url.searchParams.get("role") as UserRole | null;
  const isActive = url.searchParams.get("is_active");
  if (actor.role === UserRole.department_head) where.department_id = actor.department_id;
  if (role) where.role = role;
  if (isActive !== null) where.is_active = isActive === "true";
  const users = await db.user.findMany({ where, include: userInclude, orderBy: { created_at: "desc" } });
  return json(users.map(serializeUser));
}

export async function getUserById(request: Request, userId: number) {
  await currentUser(request);
  const user = await db.user.findUnique({ where: { id: userId }, include: userInclude });
  if (!user) fail(404, "User not found");
  return json(serializeUser(user));
}

export async function updateUser(request: Request, userId: number) {
  const actor = await requireAdminOrAbove(request);
  const body = await readBody(request, updateUserSchema);
  const existing = await db.user.findUnique({ where: { id: userId } });
  if (!existing) fail(404, "User not found");
  const roleChanged = body.role !== undefined && body.role !== existing.role;
  if (roleChanged) {
    if (actor.role !== UserRole.super_admin) fail(403, "Only Super Admin can change a user's role");
    if (existing.role === UserRole.super_admin) fail(400, "Super Admin's role cannot be changed");
    if (body.role === UserRole.super_admin) fail(400, "Cannot assign the Super Admin role");
  }
  const user = await db.user.update({ where: { id: userId }, data: body, include: userInclude });
  if (roleChanged) {
    await db.auditLog.create({
      data: { user_id: actor.id, action: "role_changed", module: "user", detail: { target_user_id: userId, old: existing.role, new: body.role } }
    });
  }
  return json(serializeUser(user));
}

export async function adminResetPassword(request: Request, userId: number) {
  const actor = await requireSuperAdmin(request);
  const body = await readBody(request, adminResetPasswordSchema);
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) fail(404, "User not found");
  await models.User.update({ hashed_password: await getPasswordHash(body.new_password), updated_at: new Date() }, { where: { id: userId } });
  await db.auditLog.create({
    data: { user_id: actor.id, action: "password_reset_by_admin", module: "user", detail: { target_user_id: userId }, ip_address: getClientIp(request) }
  });
  return json({ message: `Password updated for ${user.name}` });
}

export async function deactivateUser(request: Request, userId: number) {
  await requireSuperAdmin(request);
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) fail(404, "User not found");
  if (!user.is_active) {
    return json({ message: `User ${user.name} is already inactive`, user: serializeUser(user) });
  }
  const updatedUser = await db.user.update({ where: { id: userId }, data: { is_active: false }, include: userInclude });
  return json({ message: `User ${user.name} deactivated successfully`, user: serializeUser(updatedUser) });
}

export async function createProject(request: Request) {
  const body = await readBody(request, createProjectSchema);
  const actor = await requireSuperAdmin(request);
  const project = await db.project.create({
    data: { name: body.name, description: body.description, project_head_id: body.project_head_id, created_by: actor.id },
    include: projectInclude
  });
  return json(serializeProject(project));
}

export async function listProjects(request: Request) {
  const actor = await currentUser(request);
  let where: DbTypes.ProjectWhereInput = {};
  if ([UserRole.project_head, UserRole.department_head].includes(actor.role)) where = { project_head_id: actor.id };
  if (actor.role === UserRole.team_member) {
    const memberships = await db.projectMember.findMany({ where: { user_id: actor.id } });
    where = { id: { in: memberships.map((m) => m.project_id) } };
  }
  const projects = await db.project.findMany({ where, include: projectInclude, orderBy: { created_at: "desc" } });
  return json(projects.map(serializeProject));
}

export async function getProjectById(request: Request, projectId: number) {
  await currentUser(request);
  const project = await db.project.findUnique({ where: { id: projectId }, include: projectInclude });
  if (!project) fail(404, "Project not found");
  return json(serializeProject(project));
}

export async function updateProject(request: Request, projectId: number) {
  await requireAdminOrAbove(request);
  const body = await readBody(request, updateProjectSchema);
  const existing = await db.project.findUnique({ where: { id: projectId } });
  if (!existing) fail(404, "Project not found");
  const project = await db.project.update({ where: { id: projectId }, data: body, include: projectInclude });
  return json(serializeProject(project));
}

export async function addProjectMember(request: Request, projectId: number) {
  const body = await readBody(request, addProjectMemberSchema);
  await requireAdminOrAbove(request);
  const [project, user] = await Promise.all([
    db.project.findUnique({ where: { id: projectId } }),
    db.user.findUnique({ where: { id: body.user_id } })
  ]);
  if (!project) fail(404, "Project not found");
  if (!user) fail(404, "User not found");
  const existing = await db.projectMember.findFirst({ where: { project_id: projectId, user_id: body.user_id } });
  if (existing) fail(400, "User already in project");
  await db.projectMember.create({ data: { project_id: projectId, user_id: body.user_id } });
  return json({ message: `${user.name} added to ${project.name}` });
}

export async function listProjectMembers(request: Request, projectId: number) {
  await currentUser(request);
  const members = await db.projectMember.findMany({ where: { project_id: projectId }, include: { user: true } });
  return json(members.map((member) => ({ user_id: member.user.id, name: member.user.name, role: member.user.role, phone: member.user.phone })));
}

export async function createTask(request: Request) {
  const body = await readBody(request, createTaskSchema);
  const actor = await requireProjectHeadOrAbove(request);
  const [project, assignee] = await Promise.all([
    db.project.findUnique({ where: { id: body.project_id } }),
    db.user.findUnique({ where: { id: body.assigned_to_id } })
  ]);
  if (!project) fail(404, "Project not found");
  if (!assignee) fail(404, "Assignee not found");
  const task = await db.task.create({
    data: {
      title: body.title,
      description: body.description,
      project_id: body.project_id,
      assigned_to_id: body.assigned_to_id,
      assigned_by_id: actor.id,
      priority: body.priority,
      due_date: dateOnly(body.due_date),
      due_time: timeOnly(body.due_time),
      remarks: body.remarks
    }
  });
  const deadline = `${body.due_date}${body.due_time ? ` at ${body.due_time}` : ""}`;
  const msg = taskAssignedMessage(assignee.name, project.name, task.title, deadline, task.priority.toUpperCase());
  await sendWhatsAppMessage(assignee.phone, msg.messageId, msg.variables);
  await db.auditLog.create({ data: { user_id: actor.id, action: "task_created", module: "task", detail: { task_id: task.id, assigned_to: assignee.name } } });
  return json(serializeTask(task));
}

export async function listTasks(request: Request) {
  const actor = await currentUser(request);
  const url = new URL(request.url);
  const where: DbTypes.TaskWhereInput = { is_deleted: false };
  if (actor.role === UserRole.team_member) where.assigned_to_id = actor.id;
  else if (actor.role === UserRole.project_head) {
    const projects = await db.project.findMany({ where: { project_head_id: actor.id } });
    where.project_id = { in: projects.map((project) => project.id) };
  } else if (actor.role === UserRole.department_head) {
    const users = await db.user.findMany({ where: { department_id: actor.department_id } });
    where.assigned_to_id = { in: users.map((user) => user.id) };
  }
  const projectId = url.searchParams.get("project_id");
  const status = url.searchParams.get("status") as TaskStatus | null;
  const priority = url.searchParams.get("priority") as TaskPriority | null;
  const assignedToId = url.searchParams.get("assigned_to_id");
  if (projectId) where.project_id = Number(projectId);
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assignedToId && actor.role !== UserRole.team_member) where.assigned_to_id = Number(assignedToId);
  if (url.searchParams.get("overdue_only") === "true") {
    where.due_date = { lt: startOfToday() };
    where.status = { not: TaskStatus.completed };
  }
  const tasks = await db.task.findMany({ where, orderBy: { due_date: "asc" } });
  return json(tasks.map(serializeTask));
}

export async function getOverdueTasks(request: Request) {
  await requireAdminOrAbove(request);
  const tasks = await db.task.findMany({
    where: { due_date: { lt: startOfToday() }, status: { not: TaskStatus.completed }, is_deleted: false },
    orderBy: { due_date: "asc" }
  });
  return json(tasks.map(serializeTask));
}

export async function getTaskById(request: Request, taskId: number) {
  await currentUser(request);
  const task = await db.task.findFirst({ where: { id: taskId, is_deleted: false }, include: { follow_ups: true } });
  if (!task) fail(404, "Task not found");
  return json(serializeTask(task));
}

export async function updateTask(request: Request, taskId: number) {
  const body = await readBody(request, updateTaskSchema);
  await requireProjectHeadOrAbove(request);
  const existing = await db.task.findFirst({ where: { id: taskId, is_deleted: false } });
  if (!existing) fail(404, "Task not found");
  if (body.assigned_to_id) {
    const assignee = await db.user.findFirst({ where: { id: body.assigned_to_id, is_active: true } });
    if (!assignee) fail(404, "New assignee not found or inactive");
  }
  const data: DbTypes.TaskUpdateInput = { ...body, due_date: body.due_date ? dateOnly(body.due_date) : undefined, due_time: body.due_time ? timeOnly(body.due_time) : undefined };
  const task = await db.task.update({ where: { id: taskId }, data });
  return json(serializeTask(task));
}

async function handleEscalation(taskId: number) {
  const task = await db.task.findUnique({ where: { id: taskId }, include: { project: true, assignee: true } });
  if (!task) return;
  if (!task.escalation_level) {
    await db.task.update({ where: { id: taskId }, data: { escalation_level: EscalationLevel.level_1 } });
    const msg = taskDelayAlertMessage(task.assignee.name, task.title, task.project.name, toDateString(task.due_date) ?? "");
    await sendWhatsAppMessage(task.assignee.phone, msg.messageId, msg.variables);
  } else if (task.escalation_level === EscalationLevel.level_1 && task.project.project_head_id) {
    await db.task.update({ where: { id: taskId }, data: { escalation_level: EscalationLevel.level_2 } });
    const head = await db.user.findUnique({ where: { id: task.project.project_head_id } });
    if (head) {
      const msg = escalationToAdminMessage(task.title, task.project.name, task.assignee.name, toDateString(task.due_date) ?? "", task.delay_reason ?? "Not provided");
      await sendWhatsAppMessage(head.phone, msg.messageId, msg.variables);
    }
  } else if (task.escalation_level === EscalationLevel.level_2) {
    await db.task.update({ where: { id: taskId }, data: { escalation_level: EscalationLevel.level_3 } });
    const admin = await db.user.findFirst({ where: { role: UserRole.super_admin } });
    if (admin) {
      const msg = escalationToAdminMessage(task.title, task.project.name, task.assignee.name, toDateString(task.due_date) ?? "", task.delay_reason ?? "Not provided");
      await sendWhatsAppMessage(admin.phone, msg.messageId, msg.variables);
    }
  }
}

export async function updateTaskStatus(request: Request, taskId: number) {
  const body = await readBody(request, taskStatusUpdateSchema);
  const actor = await currentUser(request);
  const task = await db.task.findFirst({ where: { id: taskId, is_deleted: false } });
  if (!task) fail(404, "Task not found");
  if (actor.role === UserRole.team_member && task.assigned_to_id !== actor.id) fail(403, "Cannot update others' tasks");
  const oldStatus = task.status;
  const updated = await db.task.update({
    where: { id: taskId },
    data: {
      status: body.status,
      delay_reason: body.delay_reason ?? undefined,
      remarks: body.remarks ?? undefined,
      completed_at: body.status === TaskStatus.completed ? new Date() : task.completed_at
    }
  });
  if (body.status === TaskStatus.delayed) await handleEscalation(taskId);
  await db.auditLog.create({ data: { user_id: actor.id, action: "status_updated", module: "task", detail: { task_id: task.id, old: oldStatus, new: body.status } } });
  const refreshed = await db.task.findUniqueOrThrow({ where: { id: updated.id } });
  return json(serializeTask(refreshed));
}

export async function addFollowup(request: Request, taskId: number) {
  const body = await readBody(request, followUpSchema);
  const actor = await currentUser(request);
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) fail(404, "Task not found");
  const followUp = await db.taskFollowUp.create({ data: { task_id: taskId, note: body.note, updated_by: actor.id } });
  return json(serializeFollowUp(followUp));
}

export async function deleteTask(request: Request, taskId: number) {
  await requireProjectHeadOrAbove(request);
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) fail(404, "Task not found");
  await db.task.update({ where: { id: taskId }, data: { is_deleted: true } });
  return json({ message: "Task deleted" });
}

export async function createMeeting(request: Request) {
  const body = await readBody(request, createMeetingSchema);
  const actor = await requireProjectHeadOrAbove(request);

  const meeting = await db.meeting.create({
    data: {
      title: body.title,
      project_id: body.project_id,
      meeting_date: dateOnly(body.meeting_date),
      meeting_time: timeOnly(body.meeting_time),
      participants: body.participants,
      raw_notes: body.raw_notes,
      meeting_link: body.meeting_link,
      created_by: actor.id,
    },
  });

  const project = await db.project.findUnique({
    where: { id: body.project_id },
  });

  for (const userId of body.participants) {
    const user = await db.user.findFirst({
      where: {
        id: userId,
        is_active: true,
      },
    });

    if (user?.phone) {
      const msg = meetingInviteMessage(
        user.name,
        body.title,
        project?.name ?? "N/A",
        body.meeting_date,
        body.meeting_time ?? "Time not set",
        actor.name,
        body.meeting_link ?? "Link not provided"
      );
      await sendWhatsAppMessage(
        user.phone,
        msg.messageId,
        msg.variables
      );
    }
  }

  return json(serializeMeeting(meeting));
}

export async function listMeetings(request: Request) {
  await currentUser(request);
  const url = new URL(request.url);
  const where: DbTypes.MeetingWhereInput = {};
  const projectId = url.searchParams.get("project_id");
  const meetingDate = url.searchParams.get("meeting_date");
  if (projectId) where.project_id = Number(projectId);
  if (meetingDate) where.meeting_date = dateOnly(meetingDate);
  const meetings = await db.meeting.findMany({ where, orderBy: { meeting_date: "desc" } });
  return json(meetings.map(serializeMeeting));
}

export async function getMeetingById(request: Request, meetingId: number) {
  await currentUser(request);
  const meeting = await db.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) fail(404, "Meeting not found");
  return json(serializeMeeting(meeting));
}

export async function generateSummary(request: Request, meetingId: number) {
  const actor = await requireProjectHeadOrAbove(request);
  const meeting = await db.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) fail(404, "Meeting not found");
  const content = meeting.transcript ?? meeting.raw_notes;
  if (!content) fail(400, "No notes or transcript to summarize");
  const result = await generateMeetingSummary(content);
  await db.meeting.update({
    where: { id: meetingId },
    data: { ai_summary: result.summary ?? "", key_decisions: result.decisions ?? [], pending_approvals: result.pending_approvals ?? [] }
  });
  for (const item of result.action_items ?? []) {
    await db.task.create({
      data: {
        title: item.title ?? "Untitled Task",
        description: item.description ?? "",
        project_id: meeting.project_id,
        assigned_by_id: actor.id,
        assigned_to_id: actor.id,
        priority: TaskPriority.medium,
        due_date: startOfToday(),
        status: TaskStatus.not_started,
        meeting_id: meetingId,
        remarks: `Auto-created from meeting: ${meeting.title}. Owner: ${item.owner ?? "TBD"}`
      }
    });
  }
  return json(serializeMeeting(await db.meeting.findUniqueOrThrow({ where: { id: meetingId } })));
}

export async function uploadNotes(request: Request, meetingId: number) {
  await requireProjectHeadOrAbove(request);
  const url = new URL(request.url);
  const contentType = request.headers.get("content-type") ?? "";
  let notes = url.searchParams.get("notes") ?? "";
  if (contentType.includes("application/json")) notes = (await request.json()).notes ?? notes;
  if (!notes) notes = await request.text();
  const meeting = await db.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) fail(404, "Meeting not found");
  await db.meeting.update({ where: { id: meetingId }, data: { raw_notes: notes } });
  return json({ message: "Notes uploaded. Call /generate-summary to process with AI." });
}

export async function updateMeeting(request: Request, meetingId: number) {
  const body = await readBody(request, updateMeetingSchema);
  await requireProjectHeadOrAbove(request);
  const meeting = await db.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) fail(404, "Meeting not found");
  const updated = await db.meeting.update({
    where: { id: meetingId },
    data: { ...body, next_followup_date: body.next_followup_date ? dateOnly(body.next_followup_date) : undefined }
  });
  return json(serializeMeeting(updated));
}

export async function submitEod(request: Request) {
  const body = await readBody(request, eodCreateSchema);
  const actor = await currentUser(request);
  const today = startOfToday();
  const projectId = body.project_id ?? null;
  const reportData = { ...body, project_id: projectId };
  const existing = await db.eODReport.findFirst({ where: { user_id: actor.id, project_id: projectId, report_date: today } });
  if (existing) {
    const updated = await db.eODReport.update({ where: { id: existing.id }, data: { ...reportData, submitted_at: new Date() } });
    return json(serializeEod(updated));
  }
  const report = await db.eODReport.create({ data: { ...reportData, user_id: actor.id, report_date: today } });
  return json(serializeEod(report));
}

export async function myEodReports(request: Request) {
  const actor = await currentUser(request);
  const projectId = new URL(request.url).searchParams.get("project_id");
  const reports = await db.eODReport.findMany({
    where: { user_id: actor.id, ...(projectId ? { project_id: Number(projectId) } : {}) },
    orderBy: { report_date: "desc" },
    take: 30
  });
  return json(reports.map(serializeEod));
}

export async function dailyEodSummary(request: Request) {
  const actor = await requireAdminOrAbove(request);
  const url = new URL(request.url);
  const targetDate = dateOnly(url.searchParams.get("report_date") ?? new Date());
  const projectId = url.searchParams.get("project_id");
  const memberWhere: DbTypes.UserWhereInput = { is_active: true };
  if (actor.role === UserRole.department_head) memberWhere.department_id = actor.department_id;
  const allMembers = await db.user.findMany({ where: memberWhere });
  const submittedReports = await db.eODReport.findMany({
    where: { report_date: targetDate, ...(projectId ? { project_id: Number(projectId) } : {}) }
  });
  const submittedIds = new Set(submittedReports.map((report) => report.user_id));
  const notSubmitted = allMembers.filter((member) => !submittedIds.has(member.id)).map((member) => ({ user_id: member.id, name: member.name, phone: member.phone, role: member.role, department: member.department ?? null }));
  return json({
    date: toDateString(targetDate),
    total_members: allMembers.length,
    submitted_count: submittedIds.size,
    not_submitted_count: notSubmitted.length,
    not_submitted_members: notSubmitted,
    submitted_reports: submittedReports.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      project_id: r.project_id,
      report_date: toDateString(r.report_date),
      completed_work: r.completed_work,
      pending_work: r.pending_work,
      delay_reason: r.delay_reason,
      tomorrow_plan: r.tomorrow_plan,
      support_required: r.support_required,
      submitted_at: String(r.submitted_at)
    }))
  });
}

export async function sendEodSummaryToAdmin(request: Request) {
  await requireAdminOrAbove(request);
  const today = startOfToday();
  const allMembers = await db.user.findMany({ where: { is_active: true } });
  const submitted = await db.eODReport.findMany({ where: { report_date: today } });
  const submittedIds = new Set(submitted.map((report) => report.user_id));
  const notSubmitted = allMembers.filter((member) => !submittedIds.has(member.id));
  const todayStart = startOfToday();
  const [completed, pending, delayed] = await Promise.all([
    db.task.count({ where: { status: TaskStatus.completed, completed_at: { gte: todayStart } } }),
    db.task.count({ where: { status: { in: [TaskStatus.not_started, TaskStatus.in_progress, TaskStatus.waiting] } } }),
    db.task.count({ where: { status: TaskStatus.delayed } })
  ]);
  const admin = await db.user.findFirst({ where: { role: UserRole.super_admin } });
  if (!admin) return json({ message: "Super Admin not found", sent: false });
  const names = notSubmitted.map((m, i) => `${i + 1}. ${m.name}`).join("\n") || "All submitted";
  const msg = dailySummaryMessage(allMembers.length, submitted.length, notSubmitted.length, completed, pending, delayed, names);
  await sendWhatsAppMessage(admin.phone, msg.messageId, msg.variables);
  return json({ message: "EOD summary sent to admin", sent: true, total_members: allMembers.length, submitted: submitted.length, not_submitted: notSubmitted.length });
}

export async function nonSubmitters(request: Request) {
  await requireAdminOrAbove(request);
  const url = new URL(request.url);
  const targetDate = dateOnly(url.searchParams.get("report_date") ?? new Date());
  const allMembers = await db.user.findMany({ where: { is_active: true } });
  const submitted = await db.eODReport.findMany({ where: { report_date: targetDate }, select: { user_id: true } });
  const submittedIds = new Set(submitted.map((row) => row.user_id));
  return json(allMembers.filter((m) => !submittedIds.has(m.id)).map((m) => ({ id: m.id, name: m.name, phone: m.phone })));
}

export async function listEodReports(request: Request) {
  const actor = await currentUser(request);
  const url = new URL(request.url);
  const where: DbTypes.EODReportWhereInput = {};
  if (actor.role === UserRole.team_member) where.user_id = actor.id;
  else if (actor.role === UserRole.project_head) {
    const projects = await db.project.findMany({ where: { project_head_id: actor.id } });
    where.project_id = { in: projects.map((p) => p.id) };
  } else if (actor.role === UserRole.department_head) {
    const users = await db.user.findMany({ where: { department_id: actor.department_id, is_active: true } });
    where.user_id = { in: users.map((u) => u.id) };
  }
  if (url.searchParams.get("project_id")) where.project_id = Number(url.searchParams.get("project_id"));
  if (url.searchParams.get("user_id")) where.user_id = Number(url.searchParams.get("user_id"));
  if (url.searchParams.get("report_date")) where.report_date = dateOnly(url.searchParams.get("report_date")!);
  const reports = await db.eODReport.findMany({ where, include: { user: { include: { department: true } }, project: true }, orderBy: { report_date: "desc" } });
  return json(reports.map(serializeEod));
}

export async function dashboardSummary(request: Request) {
  const actor = await currentUser(request);
  const today = startOfToday();
  const taskWhere: DbTypes.TaskWhereInput = { is_deleted: false };
  if (actor.role === UserRole.team_member) taskWhere.assigned_to_id = actor.id;
  const allTasks = await db.task.findMany({ where: taskWhere });
  const todaysMeetings = await db.meeting.findMany({ where: { meeting_date: today } });
  const allMembers = await db.user.count({ where: { is_active: true, role: UserRole.team_member } });
  const submittedEod = await db.eODReport.count({ where: { report_date: today } });
  const projects = await db.project.findMany();
  const projectSummaries = projects
    .map((project) => {
      const tasks = allTasks.filter((task) => task.project_id === project.id);
      if (!tasks.length) return null;
      const completed = tasks.filter((task) => task.status === TaskStatus.completed).length;
      const delayed = tasks.filter((task) => task.status === TaskStatus.delayed).length;
      return { project_id: project.id, project_name: project.name, total_tasks: tasks.length, completed, pending: tasks.length - completed, delayed, completion_percentage: Math.round((completed / tasks.length) * 1000) / 10 };
    })
    .filter(Boolean);
  const delayedTasks = await Promise.all(
    allTasks.filter((task) => task.status === TaskStatus.delayed).slice(0, 20).map(async (task) => {
      const [assignee, project] = await Promise.all([db.user.findUnique({ where: { id: task.assigned_to_id } }), db.project.findUnique({ where: { id: task.project_id } })]);
      return { task_id: task.id, task_title: task.title, project_name: project?.name ?? "N/A", assigned_to: assignee?.name ?? "N/A", due_date: toDateString(task.due_date), escalation_level: task.escalation_level, delay_reason: task.delay_reason };
    })
  );
  const completed = allTasks.filter((task) => task.status === TaskStatus.completed);
  const pending = allTasks.filter((task) => [TaskStatus.not_started, TaskStatus.in_progress, TaskStatus.waiting].includes(task.status));
  const overdue = allTasks.filter((task) => task.due_date < today && task.status !== TaskStatus.completed);
  const highPriority = allTasks.filter((task) => task.priority === TaskPriority.high && task.status !== TaskStatus.completed);
  const escalated = allTasks.filter((task) => task.escalation_level !== null);
  return json({
    summary: {
      ttotal_tasks_today: allTasks.filter(
  (task) =>
    task.due_date &&
    new Date(task.due_date).toDateString() === today.toDateString()
).length,
      completed_tasks: completed.length,
      pending_tasks: pending.length,
      overdue_tasks: overdue.length,
      high_priority_tasks: highPriority.length,
      eod_submitted: submittedEod,
      eod_not_submitted: Math.max(0, allMembers - submittedEod),
      meetings_today: todaysMeetings.length,
      pending_decisions: escalated.length,
      escalated_tasks: escalated.length
    },
    project_summaries: projectSummaries,
    delayed_tasks: delayedTasks,
    todays_meetings: todaysMeetings.map((m) => ({ id: m.id, title: m.title, project_id: m.project_id, time: m.meeting_time ? String(m.meeting_time) : "N/A" }))
  });
}

export async function projectDashboard(request: Request, projectId: number) {
  await currentUser(request);
  const today = startOfToday();
  const tasks = await db.task.findMany({ where: { project_id: projectId, is_deleted: false } });
  return json({
    project_id: projectId,
    total_tasks: tasks.length,
    completed: tasks.filter((t) => t.status === TaskStatus.completed).length,
    in_progress: tasks.filter((t) => t.status === TaskStatus.in_progress).length,
    not_started: tasks.filter((t) => t.status === TaskStatus.not_started).length,
    delayed: tasks.filter((t) => t.status === TaskStatus.delayed).length,
    overdue: tasks.filter((t) => t.due_date < today && t.status !== TaskStatus.completed).length
  });
}

export async function broadcastMessage(request: Request) {
  const body = await readBody(request, broadcastSchema);
  await requireAdminOrAbove(request);
  const users = await db.user.findMany({ where: body.user_ids?.length ? { id: { in: body.user_ids }, is_active: true } : { is_active: true } });
  let sent = 0;
  let failed = 0;
  for (const user of users) {
    const msg = customWhatsAppMessage(body.message);
    const result = await sendWhatsAppMessage(user.phone, msg.messageId, msg.variables);
    if (result.status === "error") failed += 1;
    else sent += 1;
  }
  return json({ sent, failed, total: users.length });
}

export async function sendEodReminders(request: Request) {
  await requireAdminOrAbove(request);
  const today = startOfToday();
  const submitted = await db.eODReport.findMany({ where: { report_date: today }, select: { user_id: true } });
  const pendingMembers = await db.user.findMany({ where: { is_active: true, role: UserRole.team_member, id: { notIn: submitted.map((row) => row.user_id) } } });
  let sent = 0;
  for (const member of pendingMembers) {
    const msg = eodReminderMessage(member.name, "6:00 PM");
    await sendWhatsAppMessage(member.phone, msg.messageId, msg.variables);
    sent += 1;
  }
  return json({ message: `EOD reminders sent to ${sent} members` });
}

export async function sendTaskReminders(request: Request) {
  await requireAdminOrAbove(request);
  const tasks = await db.task.findMany({ where: { due_date: { lte: startOfToday() }, status: { not: TaskStatus.completed }, is_deleted: false }, include: { assignee: true, project: true } });
  let sent = 0;
  for (const task of tasks) {
    const msg = taskReminderMessage(task.assignee.name, task.title, task.project.name, toDateString(task.due_date) ?? "");
    await sendWhatsAppMessage(task.assignee.phone, msg.messageId, msg.variables);
    sent += 1;
  }
  return json({ message: `Task reminders sent for ${sent} tasks` });
}

export async function notificationHistory(request: Request) {
  await requireAdminOrAbove(request);
  const limit = Number(new URL(request.url).searchParams.get("limit") ?? 50);
  return json(await db.notification.findMany({ orderBy: { created_at: "desc" }, take: limit }));
}

export async function generateDailyTodoApi(request: Request) {
  await requireSuperAdmin(request);
  const url = new URL(request.url);
  const today = startOfToday();
  const yesterday = addDays(today, -1);
  const [overdueTasks, todaysTasks, todaysMeetings, pendingDecisions, delayedTasks, allMembers, submittedYesterday, highPriority] = await Promise.all([
    db.task.findMany({ where: { due_date: { lt: today }, status: { notIn: [TaskStatus.completed, TaskStatus.delayed] }, is_deleted: false }, orderBy: { due_date: "asc" }, take: 10 }),
    db.task.findMany({ where: { due_date: today, status: { not: TaskStatus.completed }, is_deleted: false }, take: 10 }),
    db.meeting.findMany({ where: { meeting_date: today } }),
    db.task.findMany({ where: { escalation_level: EscalationLevel.level_3, status: { not: TaskStatus.completed }, is_deleted: false }, take: 5 }),
    db.task.findMany({ where: { status: TaskStatus.delayed, is_deleted: false }, take: 8 }),
    db.user.findMany({ where: { is_active: true, role: UserRole.team_member } }),
    db.eODReport.findMany({ where: { report_date: yesterday } }),
    db.task.findMany({ where: { priority: TaskPriority.high, status: { not: TaskStatus.completed }, is_deleted: false }, take: 5 })
  ]);
  const submittedIds = new Set(submittedYesterday.map((report) => report.user_id));
  const eodNonSubmitters = allMembers.filter((member) => !submittedIds.has(member.id));
  const context = {
    today: toDateString(today),
    overdue_tasks: overdueTasks.map((t) => ({ title: t.title, project_id: t.project_id, due_date: toDateString(t.due_date), assigned_to: t.assigned_to_id, priority: t.priority })),
    todays_tasks: todaysTasks.map((t) => ({ title: t.title, priority: t.priority, status: t.status })),
    todays_meetings: todaysMeetings.map((m) => ({ title: m.title, time: m.meeting_time ? String(m.meeting_time) : "Time not set" })),
    pending_decisions: pendingDecisions.map((t) => ({ title: t.title, project_id: t.project_id })),
    delayed_tasks: delayedTasks.map((t) => ({ title: t.title, delay_reason: t.delay_reason ?? "No reason provided" })),
    eod_non_submitters: eodNonSubmitters.map((m) => m.name),
    high_priority_tasks: highPriority.map((t) => ({ title: t.title, status: t.status }))
  };
  const aiSummary = await generateDailyTodo(context);
  let whatsappSent = false;
  if (url.searchParams.get("send_whatsapp") === "true") {
    const admin = await db.user.findFirst({ where: { role: UserRole.super_admin } });
    if (admin) {
      const msg = customWhatsAppMessage(aiSummary);
      await sendWhatsAppMessage(admin.phone, msg.messageId, msg.variables);
      whatsappSent = true;
    }
  }
  return json({
    ai_summary: aiSummary,
    whatsapp_sent: whatsappSent,
    data: {
      overdue_tasks_count: overdueTasks.length,
      todays_tasks_count: todaysTasks.length,
      meetings_today: todaysMeetings.length,
      pending_decisions: pendingDecisions.length,
      delayed_tasks: delayedTasks.length,
      eod_non_submitters: eodNonSubmitters.length,
      high_priority_pending: highPriority.length
    }
  });
}

export async function listDepartments() {
  return json(await db.department.findMany({ orderBy: { name: "asc" } }));
}

export async function createDepartment(request: Request) {
  const actor = await requireSuperAdmin(request);
  const body = await readBody(request, departmentSchema);
  if (await db.department.findFirst({ where: { name: body.name } })) fail(400, `Department "${body.name}" already exists`);
  const department = await db.department.create({ data: { name: body.name } });
  await db.auditLog.create({ data: { user_id: actor.id, action: "department_created", module: "department", detail: { department_id: department.id, name: department.name } } });
  return json(department, 201);
}

export async function updateDepartment(request: Request, departmentId: number) {
  const actor = await requireSuperAdmin(request);
  const body = await readBody(request, departmentSchema);
  const existing = await db.department.findUnique({ where: { id: departmentId } });
  if (!existing) fail(404, "Department not found");
  const duplicate = await db.department.findFirst({ where: { name: body.name, id: { not: departmentId } } });
  if (duplicate) fail(400, `Department "${body.name}" already exists`);
  await models.Department.update({ name: body.name }, { where: { id: departmentId } });
  const department = await db.department.findUniqueOrThrow({ where: { id: departmentId } });
  await db.auditLog.create({ data: { user_id: actor.id, action: "department_updated", module: "department", detail: { department_id: departmentId, old: existing.name, new: department.name } } });
  return json(department);
}

export async function deleteDepartment(request: Request, departmentId: number) {
  const actor = await requireSuperAdmin(request);
  const existing = await db.department.findUnique({ where: { id: departmentId } });
  if (!existing) fail(404, "Department not found");
  const userCount = await db.user.count({ where: { department_id: departmentId } });
  if (userCount > 0) {
    fail(400, `Cannot delete "${existing.name}": ${userCount} ${userCount === 1 ? "user is" : "users are"} assigned to it. Move them to another department first.`);
  }
  await db.department.delete({ where: { id: departmentId } });
  await db.auditLog.create({ data: { user_id: actor.id, action: "department_deleted", module: "department", detail: { department_id: departmentId, name: existing.name } } });
  return json({ message: `Department "${existing.name}" deleted` });
}

export async function performanceByPhone(request: Request) {
  await requireAdminOrAbove(request);
  const url = new URL(request.url);
  const phone = url.searchParams.get("phone");
  const period = url.searchParams.get("period");
  const year = Number(url.searchParams.get("year") ?? new Date().getFullYear());
  const month = url.searchParams.get("month") ? Number(url.searchParams.get("month")) : undefined;
  const week = url.searchParams.get("week") ? Number(url.searchParams.get("week")) : undefined;
  if (!phone || !period) fail(422, "phone and period are required");
  const user = await db.user.findFirst({ where: { phone } });
  if (!user) fail(404, `Koi user nahi mila is phone number se: ${phone}`);
  let range;
  try {
    range = parseReportRange(period, year, month, week);
  } catch (error: any) {
    fail(400, error.message);
  }
  const tasks = await db.task.findMany({ where: { assigned_to_id: user.id, due_date: { gte: range.start, lte: range.end }, is_deleted: false } });
  const completed = tasks.filter((t) => t.status === TaskStatus.completed);
  const delayed = tasks.filter((t) => t.status === TaskStatus.delayed);
  const onTime = completed.filter((t) => t.completed_at && dateOnly(t.completed_at) <= t.due_date);
  const lateCompleted = completed.filter((t) => t.completed_at && dateOnly(t.completed_at) > t.due_date);
  const total = tasks.length;
  const taskStats = {
    total_assigned: total,
    completed: completed.length,
    delayed: delayed.length,
    not_started: tasks.filter((t) => t.status === TaskStatus.not_started).length,
    in_progress: tasks.filter((t) => t.status === TaskStatus.in_progress).length,
    on_time_completed: onTime.length,
    late_completed: lateCompleted.length,
    completion_rate: total ? Math.round((completed.length / total) * 1000) / 10 : 0,
    on_time_rate: completed.length ? Math.round((onTime.length / completed.length) * 1000) / 10 : 0,
    delay_rate: total ? Math.round((delayed.length / total) * 1000) / 10 : 0,
    tasks_detail: tasks.map((t) => ({ id: t.id, title: t.title, project_id: t.project_id, priority: t.priority, status: t.status, due_date: toDateString(t.due_date), completed_at: t.completed_at ? toDateString(t.completed_at) : null, on_time: t.completed_at ? dateOnly(t.completed_at) <= t.due_date : null, delay_reason: t.delay_reason }))
  };
  const reports = await db.eODReport.findMany({ where: { user_id: user.id, report_date: { gte: range.start, lte: range.end } }, orderBy: { report_date: "desc" } });
  const workingDays = workingDaysInclusive(range.start, range.end);
  const eodStats = {
    total_working_days: workingDays,
    submitted: reports.length,
    missed: Math.max(0, workingDays - reports.length),
    compliance_rate: workingDays ? Math.round((reports.length / workingDays) * 1000) / 10 : 0,
    reports: reports.map((r) => ({ date: toDateString(r.report_date), completed_work: r.completed_work, pending_work: r.pending_work, delay_reason: r.delay_reason, tomorrow_plan: r.tomorrow_plan, support_required: r.support_required, submitted_at: String(r.submitted_at) }))
  };
  const overall = Math.round((taskStats.completion_rate * 0.4 + taskStats.on_time_rate * 0.35 + eodStats.compliance_rate * 0.25) * 10) / 10;
  const grade = overall >= 90 ? ["A+", "Excellent"] : overall >= 80 ? ["A", "Very Good"] : overall >= 70 ? ["B", "Good"] : overall >= 60 ? ["C", "Average"] : overall >= 50 ? ["D", "Below Average"] : ["F", "Poor"];
  return json({
    user: { id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role, is_active: user.is_active },
    report_period: { period, year, month: month ?? null, week: week ?? null, start_date: toDateString(range.start), end_date: toDateString(range.end) },
    performance_score: { overall_score: overall, grade: grade[0], label: grade[1], breakdown: { task_completion_score: Math.round(taskStats.completion_rate * 0.4 * 10) / 10, on_time_score: Math.round(taskStats.on_time_rate * 0.35 * 10) / 10, eod_compliance_score: Math.round(eodStats.compliance_rate * 0.25 * 10) / 10 } },
    task_performance: taskStats,
    eod_compliance: eodStats
  });
}

export async function schedulerAction(request: Request, action: "evening" | "eod-reminders" | "daily-todo" | "eod-summary" | "overdue-check" | "status") {
  await requireSuperAdmin(request);
  if (action === "status") return json(schedulerStatus());
  if (action === "evening") await jobEveningReport();
  if (action === "eod-reminders") await jobSendEodReminders();
  if (action === "daily-todo") await jobDailyTodo();
  if (action === "eod-summary") await jobEodSummary();
  if (action === "overdue-check") await jobCheckOverdueEscalation();
  const messages = {
    evening: "Evening report job triggered",
    "eod-reminders": "EOD reminder job triggered",
    "daily-todo": "Daily todo job triggered",
    "eod-summary": "EOD summary job triggered",
    "overdue-check": "Overdue check job triggered"
  };
  return json({ message: messages[action] });
}
