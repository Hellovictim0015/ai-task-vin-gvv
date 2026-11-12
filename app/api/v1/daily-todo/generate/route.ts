import { generateDailyTodoApi } from "@/lib/controllers";
import { handle } from "@/lib/http";

export async function POST(request: Request) {
  return handle(() => generateDailyTodoApi(request));
}
