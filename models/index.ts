import { DataTypes, Model, Sequelize } from "sequelize";
import { EscalationLevel, NotificationChannel, NotificationStatus, ProjectStatus, TaskPriority, TaskStatus, UserRole } from "@/lib/enums";

export type AnyModel = typeof Model & { new (): Model };

export function defineModels(sequelize: Sequelize) {
  const User = sequelize.define("User", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    phone: { type: DataTypes.STRING(15), allowNull: false, unique: true },
    email: { type: DataTypes.STRING(100), allowNull: true, unique: true },
    hashed_password: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.ENUM(...Object.values(UserRole)), allowNull: false, defaultValue: UserRole.team_member },
    department_id: { type: DataTypes.INTEGER, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: "users", timestamps: false });

  const Department = sequelize.define("Department", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(150), allowNull: false, unique: true }
  }, { tableName: "departments", timestamps: false });

  const Project = sequelize.define("Project", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    project_head_id: { type: DataTypes.INTEGER, allowNull: true },
    status: { type: DataTypes.ENUM(...Object.values(ProjectStatus)), allowNull: false, defaultValue: ProjectStatus.active },
    created_by: { type: DataTypes.INTEGER, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: "projects", timestamps: false });

  const ProjectMember = sequelize.define("ProjectMember", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    project_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    joined_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: "project_members", timestamps: false });

  const Task = sequelize.define("Task", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    project_id: { type: DataTypes.INTEGER, allowNull: false },
    assigned_to_id: { type: DataTypes.INTEGER, allowNull: false },
    assigned_by_id: { type: DataTypes.INTEGER, allowNull: false },
    priority: { type: DataTypes.ENUM(...Object.values(TaskPriority)), allowNull: false, defaultValue: TaskPriority.medium },
    status: { type: DataTypes.ENUM(...Object.values(TaskStatus)), allowNull: false, defaultValue: TaskStatus.not_started },
    due_date: { type: DataTypes.DATEONLY, allowNull: false },
    due_time: { type: DataTypes.TIME, allowNull: true },
    delay_reason: { type: DataTypes.TEXT, allowNull: true },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    attachment_url: { type: DataTypes.STRING(500), allowNull: true },
    escalation_level: { type: DataTypes.ENUM(...Object.values(EscalationLevel)), allowNull: true },
    meeting_id: { type: DataTypes.INTEGER, allowNull: true },
    is_deleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    completed_at: { type: DataTypes.DATE, allowNull: true }
  }, { tableName: "tasks", timestamps: false });

  const TaskFollowUp = sequelize.define("TaskFollowUp", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    task_id: { type: DataTypes.INTEGER, allowNull: false },
    note: { type: DataTypes.TEXT, allowNull: false },
    updated_by: { type: DataTypes.INTEGER, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: "task_follow_ups", timestamps: false });

  const Meeting = sequelize.define("Meeting", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING(255), allowNull: false },
    project_id: { type: DataTypes.INTEGER, allowNull: false },
    meeting_date: { type: DataTypes.DATEONLY, allowNull: false },
    meeting_time: { type: DataTypes.TIME, allowNull: true },
    meeting_link: { type: DataTypes.STRING(500), allowNull: true },
    participants: { type: DataTypes.JSON, allowNull: true },
    raw_notes: { type: DataTypes.TEXT, allowNull: true },
    transcript: { type: DataTypes.TEXT, allowNull: true },
    ai_summary: { type: DataTypes.TEXT, allowNull: true },
    key_decisions: { type: DataTypes.JSON, allowNull: true },
    pending_approvals: { type: DataTypes.JSON, allowNull: true },
    next_followup_date: { type: DataTypes.DATEONLY, allowNull: true },
    audio_file_url: { type: DataTypes.STRING(500), allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: "meetings", timestamps: false });

  const EODReport = sequelize.define("EODReport", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    project_id: { type: DataTypes.INTEGER, allowNull: true },
    report_date: { type: DataTypes.DATEONLY, allowNull: false },
    completed_work: { type: DataTypes.TEXT, allowNull: false },
    pending_work: { type: DataTypes.TEXT, allowNull: true },
    delay_reason: { type: DataTypes.TEXT, allowNull: true },
    tomorrow_plan: { type: DataTypes.TEXT, allowNull: true },
    support_required: { type: DataTypes.TEXT, allowNull: true },
    submitted_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: "eod_reports", timestamps: false });

  const Notification = sequelize.define("Notification", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    notification_type: { type: DataTypes.STRING(50), allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    channel: { type: DataTypes.ENUM(...Object.values(NotificationChannel)), allowNull: false, defaultValue: NotificationChannel.whatsapp },
    status: { type: DataTypes.ENUM(...Object.values(NotificationStatus)), allowNull: false, defaultValue: NotificationStatus.pending },
    reference_id: { type: DataTypes.INTEGER, allowNull: true },
    reference_type: { type: DataTypes.STRING(50), allowNull: true },
    sent_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: "notifications", timestamps: false });

  const AuditLog = sequelize.define("AuditLog", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: true },
    action: { type: DataTypes.STRING(100), allowNull: false },
    module: { type: DataTypes.STRING(50), allowNull: false },
    detail: { type: DataTypes.JSON, allowNull: true },
    ip_address: { type: DataTypes.STRING(45), allowNull: true },
    timestamp: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: "audit_logs", timestamps: false });

  User.belongsTo(Department, { foreignKey: "department_id", as: "department" });
  Department.hasMany(User, { foreignKey: "department_id", as: "users" });
  Project.belongsTo(User, { foreignKey: "project_head_id", as: "project_head" });
  Task.belongsTo(Project, { foreignKey: "project_id", as: "project" });
  Task.belongsTo(User, { foreignKey: "assigned_to_id", as: "assignee" });
  Task.belongsTo(User, { foreignKey: "assigned_by_id", as: "creator" });
  Task.hasMany(TaskFollowUp, { foreignKey: "task_id", as: "follow_ups" });
  ProjectMember.belongsTo(Project, { foreignKey: "project_id", as: "project" });
  ProjectMember.belongsTo(User, { foreignKey: "user_id", as: "user" });
  Meeting.belongsTo(Project, { foreignKey: "project_id", as: "project" });
  Meeting.belongsTo(User, { foreignKey: "created_by", as: "creator" });
  Task.belongsTo(Meeting, { foreignKey: "meeting_id", as: "meeting" });
  EODReport.belongsTo(User, { foreignKey: "user_id", as: "user" });
  EODReport.belongsTo(Project, { foreignKey: "project_id", as: "project" });
  Notification.belongsTo(User, { foreignKey: "user_id", as: "user" });
  AuditLog.belongsTo(User, { foreignKey: "user_id", as: "user" });

  return { User, Department, Project, ProjectMember, Task, TaskFollowUp, Meeting, EODReport, Notification, AuditLog };
}
