import { getMeetingById, updateMeeting } from "@/lib/controllers";
import { handle, intParam } from "@/lib/http";

export async function GET(request: Request, { params }: { params: Promise<{ meeting_id: string }> }) {
  const routeParams = await params;
  return handle(() => getMeetingById(request, intParam(routeParams.meeting_id, "meeting_id")));
}

export async function PUT(request: Request, { params }: { params: Promise<{ meeting_id: string }> }) {
  const routeParams = await params;
  return handle(() => updateMeeting(request, intParam(routeParams.meeting_id, "meeting_id")));
}