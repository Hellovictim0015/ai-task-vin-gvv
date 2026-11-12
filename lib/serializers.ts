import { toDateString, toTimeString } from "./dates";

type AnyRecord = Record<string, any>;

export function serializeUser(user: AnyRecord) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    department: user.department ? { id: user.department.id, name: user.department.name } : null,
    is_active: user.is_active,
    created_at: user.created_at
  };
}

export function serializeProject(project: AnyRecord) {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    project_head_id: project.project_head_id,
    created_at: project.created_at,
    project_head: project.project_head ? { id: project.project_head.id, name: project.project_head.name } : null
  };
}

export function serializeTask(task: AnyRecord) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    project_id: task.project_id,
    assigned_to_id: task.assigned_to_id,
    assigned_by_id: task.assigned_by_id,
    priority: task.priority,
    status: task.status,
    due_date: toDateString(task.due_date),
    due_time: toTimeString(task.due_time),
    delay_reason: task.delay_reason,
    remarks: task.remarks,
    escalation_level: task.escalation_level,
    created_at: task.created_at,
    updated_at: task.updated_at,
    completed_at: task.completed_at,
    follow_ups: task.follow_ups?.map(serializeFollowUp)
  };
}

export function serializeFollowUp(followUp: AnyRecord) {
  return {
    id: followUp.id,
    note: followUp.note,
    updated_by: followUp.updated_by,
    created_at: followUp.created_at
  };
}

export function serializeMeeting(meeting: AnyRecord) {
  return {
    id: meeting.id,
    title: meeting.title,
    project_id: meeting.project_id,
    meeting_date: toDateString(meeting.meeting_date),
    meeting_time: toTimeString(meeting.meeting_time),
    participants: meeting.participants ?? null,
    raw_notes: meeting.raw_notes,
    ai_summary: meeting.ai_summary,
    key_decisions: meeting.key_decisions ?? null,
    pending_approvals: meeting.pending_approvals ?? null,
    next_followup_date: toDateString(meeting.next_followup_date),
    created_at: meeting.created_at
  };
}

export function serializeEod(report: AnyRecord) {
  return {
    id: report.id,
    user_id: report.user_id,
    project_id: report.project_id,
    report_date: toDateString(report.report_date),
    completed_work: report.completed_work,
    pending_work: report.pending_work,
    delay_reason: report.delay_reason,
    tomorrow_plan: report.tomorrow_plan,
    support_required: report.support_required,
    submitted_at: report.submitted_at,
    user: report.user
      ? {
          id: report.user.id,
          name: report.user.name,
          role: report.user.role,
          department: report.user.department?.name ?? null
        }
      : null,
    project: report.project ? { id: report.project.id, name: report.project.name } : null
  };
}

