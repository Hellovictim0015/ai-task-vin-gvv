import { deleteTask, getTaskById, updateTask } from "@/lib/controllers";
import { handle, intParam } from "@/lib/http";

export async function GET(request: Request, { params }: { params: Promise<{ task_id: string }> }) {
  const routeParams = await params;
  return handle(() => getTaskById(request, intParam(routeParams.task_id, "task_id")));
}

export async function PUT(request: Request, { params }: { params: Promise<{ task_id: string }> }) {
  const routeParams = await params;
  return handle(() => updateTask(request, intParam(routeParams.task_id, "task_id")));
}

export async function DELETE(request: Request, { params }: { params: Promise<{ task_id: string }> }) {
  const routeParams = await params;
  return handle(() => deleteTask(request, intParam(routeParams.task_id, "task_id")));
}