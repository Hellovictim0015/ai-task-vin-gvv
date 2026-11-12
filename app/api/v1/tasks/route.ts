import { createTask, listTasks } from "@/lib/controllers";
import { handle } from "@/lib/http";

export async function GET(request: Request) {
  return handle(() => listTasks(request));
}

export async function POST(request: Request) {
  return handle(() => createTask(request));
}
