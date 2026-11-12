import { updateTaskStatus } from "@/lib/controllers";
import { handle, intParam } from "@/lib/http";

export async function PATCH(request: Request, { params }: { params: Promise<{ task_id: string }> }) {
  const routeParams = await params;
  return handle(() => updateTaskStatus(request, intParam(routeParams.task_id, "task_id")));
}