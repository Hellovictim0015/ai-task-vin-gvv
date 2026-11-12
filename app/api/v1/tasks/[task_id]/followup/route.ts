import { addFollowup } from "@/lib/controllers";
import { handle, intParam } from "@/lib/http";

export async function POST(request: Request, { params }: { params: Promise<{ task_id: string }> }) {
  const routeParams = await params;
  return handle(() => addFollowup(request, intParam(routeParams.task_id, "task_id")));
}