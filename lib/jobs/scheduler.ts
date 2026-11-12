import cron, { ScheduledTask } from "node-cron";
import { TaskStatus, UserRole } from "../enums";
import { settings } from "../config";
import { startOfToday, toDateString } from "../dates";
import { logger } from "../logger";
import { db } from "../data";
import { generateDailyTodo } from "../services/ai";
import { customWhatsAppMessage, dailySummaryMessage, eodReminderMessage, sendWhatsAppMessage } from "../services/whatsapp";

const jobs: ScheduledTask[] = [];

function cronTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return `${minute} ${hour} * * *`;
}

export async function jobSendEodReminders() {
  logger.info("[CRON] Sending EOD reminders");
  const today = startOfToday();
  const submitted = await db.eODReport.findMany({ where: { report_date: today }, select: { user_id: true } });
  const submittedIds = submitted.map((row) => row.user_id);
  const pending = await db.user.findMany({
    where: { is_active: true, role: UserRole.team_member, id: { notIn: submittedIds } }
  });
  for (const member of pending) {
    const msg = eodReminderMessage(member.name, "6:00 PM");
    await sendWhatsAppMessage(member.phone, msg.messageId, msg.variables);
  }
  logger.info({ count: pending.length }, "[CRON] EOD reminders sent");
}

export async function jobEodSummary() {
  logger.info("[CRON] Sending EOD summary");
  const today = startOfToday();
  const allMembers = await db.user.findMany({ where: { is_active: true, role: UserRole.team_member } });
  const submitted = await db.eODReport.findMany({ where: { report_date: today } });
  const submittedIds = new Set(submitted.map((row) => row.user_id));
  const notSubmitted = allMembers.filter((member) => !submittedIds.has(member.id));
  const [completed, pending, delayed] = await Promise.all([
    db.task.count({ where: { status: TaskStatus.completed } }),
    db.task.count({ where: { status: { in: [TaskStatus.not_started, TaskStatus.in_progress, TaskStatus.waiting] } } }),
    db.task.count({ where: { status: TaskStatus.delayed } })
  ]);
  const names = notSubmitted.map((member, index) => `${index + 1}. ${member.name}`).join("\n") || "All submitted";
  const admin = await db.user.findFirst({ where: { role: UserRole.super_admin } });
  if (admin) {
    const msg = dailySummaryMessage(allMembers.length, submitted.length, notSubmitted.length, completed, pending, delayed, names);
    await sendWhatsAppMessage(
      admin.phone,
      msg.messageId,
      msg.variables
    );
  }
}

export async function jobDailyTodo() {
  logger.info("[CRON] Generating daily todo");
  const today = startOfToday();
  const [overdue, todaysTasks, meetings, escalated] = await Promise.all([
    db.task.findMany({ where: { due_date: { lt: today }, status: { not: TaskStatus.completed }, is_deleted: false }, take: 10 }),
    db.task.findMany({ where: { due_date: today, is_deleted: false }, take: 10 }),
    db.meeting.findMany({ where: { meeting_date: today } }),
    db.task.findMany({ where: { escalation_level: { not: null } }, take: 5 })
  ]);
  const summary = await generateDailyTodo({
    today: toDateString(today),
    overdue_tasks: overdue.map((task) => task.title),
    todays_tasks: todaysTasks.map((task) => task.title),
    pending_decisions: escalated.map((task) => task.title),
    meetings: meetings.map((meeting) => meeting.title),
    eod_non_submitters: []
  });
  const admin = await db.user.findFirst({ where: { role: UserRole.super_admin } });
  if (admin) {
    const msg = customWhatsAppMessage(summary);
    await sendWhatsAppMessage(admin.phone, msg.messageId, msg.variables);
  }
}

export async function jobCheckOverdueEscalation() {
  logger.info("[CRON] Checking overdue tasks");
  await db.task.updateMany({
    where: {
      due_date: { lt: startOfToday() },
      status: { notIn: [TaskStatus.completed, TaskStatus.delayed] },
      is_deleted: false
    },
    data: { status: TaskStatus.delayed }
  });
}

export async function jobEveningReport() {
  await jobEodSummary();
}

export function startScheduler() {
  if (jobs.length > 0) return;
  jobs.push(cron.schedule(cronTime(settings.DAILY_TODO_TIME), () => void jobDailyTodo()));
  jobs.push(cron.schedule(cronTime(settings.EOD_REMINDER_TIME), () => void jobSendEodReminders()));
  jobs.push(cron.schedule(cronTime(settings.EOD_SUMMARY_TIME), () => void jobEodSummary()));
  jobs.push(cron.schedule("0 * * * *", () => void jobCheckOverdueEscalation()));
  logger.info("Scheduler started with all cron jobs");
}

export function schedulerStatus() {
  const getStatus = (job: ScheduledTask) => (job as ScheduledTask & { getStatus?: () => string }).getStatus?.() ?? "scheduled";
  return {
    scheduler_running: jobs.some((job) => getStatus(job) === "scheduled"),
    total_jobs: jobs.length,
    jobs: jobs.map((job, index) => ({
      job_id: `job_${index + 1}`,
      name: `scheduled_job_${index + 1}`,
      next_run: "Managed by node-cron"
    }))
  };
}
