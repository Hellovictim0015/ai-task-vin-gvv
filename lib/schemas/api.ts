import { z } from "zod";

export const userRole = z.enum(["super_admin", "admin", "project_head", "department_head", "team_member"]);
export const taskPriority = z.enum(["high", "medium", "low"]);
export const taskStatus = z.enum(["not_started", "in_progress", "waiting", "completed", "delayed"]);
export const projectStatus = z.enum(["active", "on_hold", "completed", "archived"]);

const phone = z.string().transform((value, ctx) => {
  const normalized = value.trim().replaceAll(" ", "").replaceAll("-", "");
  if (!/^\d+$/.test(normalized)) ctx.addIssue({ code: "custom", message: "Phone must contain only digits" });
  if (normalized.length < 10) ctx.addIssue({ code: "custom", message: "Phone must be at least 10 digits" });
  return normalized;
});

export const loginSchema = z.object({ phone: z.string(), password: z.string() });
export const changePasswordSchema = z.object({ old_password: z.string(), new_password: z.string() });

export const createUserSchema = z.object({
  name: z.string(),
  phone,
  email: z.string().email().nullable().optional(),
  password: z.string().optional(),
  role: userRole.default("team_member"),
  department_id: z.number().int().nullable().optional()
});

export const updateUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().nullable().optional(),
  department_id: z.number().int().nullable().optional(),
  is_active: z.boolean().optional(),
  role: userRole.optional()
});

export const createProjectSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  project_head_id: z.number().int().nullable().optional()
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  status: projectStatus.optional()
});

export const addProjectMemberSchema = z.object({ user_id: z.number().int() });

export const createTaskSchema = z.object({
  title: z.string(),
  description: z.string().nullable().optional(),
  project_id: z.number().int(),
  assigned_to_id: z.number().int(),
  priority: taskPriority.default("medium"),
  due_date: z.string(),
  due_time: z.string().nullable().optional(),
  remarks: z.string().nullable().optional()
});

export const updateTaskSchema = createTaskSchema
  .omit({ project_id: true })
  .partial()
  .extend({ assigned_to_id: z.number().int().optional() });

export const taskStatusUpdateSchema = z.object({
  status: taskStatus,
  delay_reason: z.string().nullable().optional(),
  remarks: z.string().nullable().optional()
});

export const followUpSchema = z.object({ note: z.string() });

export const createMeetingSchema = z.object({
  title: z.string(),
  project_id: z.number().int(),
  meeting_date: z.string(),
  meeting_time: z.string().nullable().optional(),
  participants: z.array(z.number().int()).optional().default([]),
  meeting_link: z.string().nullable().optional(),
  raw_notes: z.string().nullable().optional()
});

export const updateMeetingSchema = z.object({
  title: z.string().optional(),
  raw_notes: z.string().nullable().optional(),
  next_followup_date: z.string().nullable().optional()
});

export const eodCreateSchema = z.object({
  project_id: z.number().int().nullable().optional(),
  completed_work: z.string(),
  pending_work: z.string().nullable().optional(),
  delay_reason: z.string().nullable().optional(),
  tomorrow_plan: z.string().nullable().optional(),
  support_required: z.string().nullable().optional()
});

export const adminResetPasswordSchema = z.object({
  new_password: z.string().min(6, "Password must be at least 6 characters").max(100, "Password is too long")
});

export const departmentSchema = z.object({
  name: z.string().trim().min(2, "Department name must be at least 2 characters").max(150, "Department name is too long")
});

export const broadcastSchema = z.object({
  message: z.string(),
  user_ids: z.array(z.number().int()).nullable().optional()
});
