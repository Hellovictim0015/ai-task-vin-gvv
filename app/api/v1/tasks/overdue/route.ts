import { getOverdueTasks } from "@/lib/controllers";
import { handle } from "@/lib/http";

export async function GET(request: Request) {
  return handle(() => getOverdueTasks(request));
}
