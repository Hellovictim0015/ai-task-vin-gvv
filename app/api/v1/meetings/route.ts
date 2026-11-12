import { createMeeting, listMeetings } from "@/lib/controllers";
import { handle } from "@/lib/http";

export async function GET(request: Request) {
  return handle(() => listMeetings(request));
}

export async function POST(request: Request) {
  return handle(() => createMeeting(request));
}
