import { uploadNotes } from "@/lib/controllers";
import { handle, intParam } from "@/lib/http";

export async function POST(request: Request, { params }: { params: Promise<{ meeting_id: string }> }) {
  const routeParams = await params;
  return handle(() => uploadNotes(request, intParam(routeParams.meeting_id, "meeting_id")));
}