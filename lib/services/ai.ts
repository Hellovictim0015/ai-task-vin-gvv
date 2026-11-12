import OpenAI from "openai";
import { settings } from "../config";
import { logger } from "../logger";

const client = settings.OPENAI_API_KEY ? new OpenAI({ apiKey: settings.OPENAI_API_KEY }) : null;

export async function generateDailyTodo(context: Record<string, unknown>) {
  if (!client) return generateSimpleTodo(context);

  try {
    const prompt = `You are an AI Personal Secretary for Prakhar Bagora.
Generate a clear, professional, action-oriented morning priority list.

Today's Date: ${context.today}

Data:
- Overdue Tasks: ${JSON.stringify(context.overdue_tasks)}
- Today's Tasks: ${JSON.stringify(context.todays_tasks)}
- Today's Meetings: ${JSON.stringify(context.meetings ?? context.todays_meetings)}
- Pending Decisions: ${JSON.stringify(context.pending_decisions)}
- Delayed Tasks: ${JSON.stringify(context.delayed_tasks)}
- EOD Non-Submitters: ${JSON.stringify(context.eod_non_submitters)}
- High Priority Pending: ${JSON.stringify(context.high_priority_tasks)}

Start with: Good Morning Prakhar Sir.
Then list priorities in order of urgency.
Keep it concise and actionable.`;

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 1000
    });
    return response.choices[0]?.message?.content ?? generateSimpleTodo(context);
  } catch (error) {
    logger.error({ error }, "OpenAI daily todo failed");
    return generateSimpleTodo(context);
  }
}

function titleOf(item: unknown) {
  if (item && typeof item === "object" && "title" in item) return String((item as { title: unknown }).title);
  return String(item);
}

function generateSimpleTodo(context: Record<string, any>) {
  const lines = [`Good Morning Prakhar Sir!\n`, `Aaj ka Date: ${context.today ?? new Date().toISOString().slice(0, 10)}\n`];
  const sections: Array<[string, unknown[] | undefined]> = [
    ["HIGH PRIORITY DECISIONS", context.pending_decisions],
    ["OVERDUE WORK", context.overdue_tasks],
    ["TODAY'S TASKS", context.todays_tasks],
    ["TODAY'S MEETINGS", context.todays_meetings ?? context.meetings],
    ["DELAYED TASKS", context.delayed_tasks],
    ["EOD NOT SUBMITTED", context.eod_non_submitters],
    ["HIGH PRIORITY TASKS", context.high_priority_tasks]
  ];
  for (const [label, items] of sections) {
    if (!items?.length) continue;
    lines.push(label);
    items.forEach((item, index) => lines.push(`  ${index + 1}. ${titleOf(item)}`));
    lines.push("");
  }
  lines.push("- AI-PS System");
  return lines.join("\n");
}

export async function generateMeetingSummary(transcriptOrNotes: string) {
  if (!client) {
    return {
      summary: "AI not configured. Add OPENAI_API_KEY in .env",
      decisions: [],
      action_items: [],
      pending_approvals: []
    };
  }

  try {
    const prompt = `Analyze the following meeting notes/transcript.

Extract:
1. Summary (2-3 lines)
2. Key Discussion Points
3. Decisions Taken
4. Action Items - task_title, owner_name, deadline, priority
5. Pending Approvals

Meeting Content:
${transcriptOrNotes}

Respond in JSON:
{
  "summary": "...",
  "key_points": ["..."],
  "decisions": ["..."],
  "action_items": [
    {"title": "...", "owner": "...", "deadline": "...", "priority": "high/medium/low"}
  ],
  "pending_approvals": ["..."],
  "next_followup": "..."
}`;
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3
    });
    return JSON.parse(response.choices[0]?.message?.content ?? "{}");
  } catch (error: any) {
    logger.error({ error }, "OpenAI meeting summary failed");
    return {
      summary: `Error generating summary: ${error?.message ?? String(error)}`,
      decisions: [],
      action_items: [],
      pending_approvals: []
    };
  }
}

export async function extractTasksFromText(text: string) {
  if (!client) return [];
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `From the following text, identify all actionable tasks. Respond as JSON {"tasks":[{"title":"","description":"","responsible_person":"","deadline":"","priority":"","dependency":""}]}.\n\nText:\n${text}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });
    const result = JSON.parse(response.choices[0]?.message?.content ?? "{}");
    return Array.isArray(result.tasks) ? result.tasks : [];
  } catch (error) {
    logger.error({ error }, "OpenAI task extraction failed");
    return [];
  }
}

