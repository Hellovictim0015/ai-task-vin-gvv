import { projectDashboard } from "@/lib/controllers";
import { handle, intParam } from "@/lib/http";

export async function GET(request: Request, { params }: { params: Promise<{ project_id: string }> }) {
  const routeParams = await params;
  return handle(() => projectDashboard(request, intParam(routeParams.project_id, "project_id")));
}