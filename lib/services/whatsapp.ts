
import { settings } from "../config";
import { logger } from "../logger";

type WhatsAppTemplateMessage = {
  messageId: string;
  variables: string;
};

function templateMessage(messageId: string, variables: Array<string | number>): WhatsAppTemplateMessage {
  return {
    messageId,
    variables: variables.map((value) => String(value)).join("|")
  };
}

export async function sendWhatsAppMessage(
  phone: string,
  messageId: string,
  variables: string
) {
  try {
    const url = new URL("https://www.fast2sms.com/dev/whatsapp");

    url.searchParams.append("message_id", messageId);

    url.searchParams.append(
      "phone_number_id",
      settings.FAST2SMS_PHONE_NUMBER_ID
    );

    url.searchParams.append("numbers", phone);

    // Template variables
    url.searchParams.append("variables_values", variables);

    console.log("========== FAST2SMS REQUEST ==========");
    console.log("URL:", url.toString());
    console.log("Phone:", phone);
    console.log("Message ID:", messageId);
    console.log("Variables:", variables);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: settings.FAST2SMS_API_KEY,
        Accept: "application/json",
      },
    });

    console.log("HTTP Status:", response.status);

    const result = await response.json();

    console.log("========== FAST2SMS RESPONSE ==========");
    console.log(JSON.stringify(result, null, 2));

    logger.info(result, "[Fast2SMS SUCCESS]");

    if (result.returned === true) {
      console.log("✅ WhatsApp Message Sent Successfully");
    } else {
      console.log("❌ WhatsApp Message Failed");
    }

    return result;
  } catch (error: any) {
    console.error("========== FAST2SMS ERROR ==========");
    console.error(error);
    console.error(error?.message);

    logger.error(error, "[Fast2SMS ERROR]");

    return {
      status: "error",
      detail: error?.message ?? String(error),
    };
  }
}

export function taskAssignedMessage(name: string, project: string, task: string, deadline: string, priority: string) {
  return templateMessage("26165", [name, project, task, deadline, priority]);

  // done  pending 
}

export function taskReminderMessage(name: string, task: string, project: string, deadline: string) {
  return templateMessage("26166", [name, task, project, deadline]);

  // done pending 
}

export function taskDelayAlertMessage(name: string, task: string, project: string, originalDeadline: string) {
  return templateMessage("26167", [name, task, project, originalDeadline]);

  // done pending 
}

export function escalationToAdminMessage(task: string, project: string, assignedTo: string, deadline: string, delayReason = "Not provided") {
  return templateMessage("26169", [project, task, assignedTo, deadline, "Delayed", delayReason]);
  // done pending
}

export function eodReminderMessage(name: string, deadline: string) {
  return templateMessage("26170", [name, deadline]);
  // done pending 
}

export function newAccountMessage(name: string, phone: string, password: string, platformUrl: string) {
  return templateMessage("26137", [name, platformUrl, phone, password]);
  // done
}

export function dailySummaryMessage(total: number, submitted: number, notSubmitted: number, completedTasks: number, pendingTasks: number, delayedTasks: number, notSubmittedNames: string) {
  return templateMessage("26172", [total, submitted, notSubmitted, completedTasks, pendingTasks, delayedTasks, notSubmittedNames]);
  // done pending
}

export function meetingInviteMessage(name: string, meetingTitle: string, project: string, meetingDate: string, meetingTime: string, organizedBy: string, meetingLink = "Link not provided") {
  return templateMessage("26142", [name, meetingTitle, project, meetingDate, meetingTime, organizedBy, meetingLink]);
}

export function customWhatsAppMessage(message: string) {
  return templateMessage("26173", [message]);

  // done pending 
}
