import { dashboardSummary } from "@/lib/controllers";
import { handle } from "@/lib/http";

export async function GET(request: Request) {
  return handle(() => dashboardSummary(request));
}
