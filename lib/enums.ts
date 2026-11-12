export enum UserRole {
  super_admin = "super_admin",
  admin = "admin",
  project_head = "project_head",
  department_head = "department_head",
  team_member = "team_member"
}

export enum TaskPriority {
  high = "high",
  medium = "medium",
  low = "low"
}

export enum TaskStatus {
  not_started = "not_started",
  in_progress = "in_progress",
  waiting = "waiting",
  completed = "completed",
  delayed = "delayed"
}

export enum ProjectStatus {
  active = "active",
  on_hold = "on_hold",
  completed = "completed",
  archived = "archived"
}

export enum NotificationChannel {
  whatsapp = "whatsapp",
  email = "email",
  system = "system"
}

export enum NotificationStatus {
  pending = "pending",
  sent = "sent",
  failed = "failed"
}

export enum EscalationLevel {
  level_1 = "level_1",
  level_2 = "level_2",
  level_3 = "level_3",
  resolved = "resolved"
}

export namespace DbTypes {
  export type UserInclude = Record<string, unknown>;
  export type ProjectInclude = Record<string, unknown>;
  export type UserWhereInput = Record<string, any>;
  export type ProjectWhereInput = Record<string, any>;
  export type TaskWhereInput = Record<string, any>;
  export type MeetingWhereInput = Record<string, any>;
  export type EODReportWhereInput = Record<string, any>;
  export type TaskUpdateInput = Record<string, any>;
}
