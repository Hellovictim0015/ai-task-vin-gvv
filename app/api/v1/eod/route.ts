import { listEodReports } from "@/lib/controllers";
import { handle } from "@/lib/http";

export async function GET(request: Request) {
  return handle(() => listEodReports(request));
}
