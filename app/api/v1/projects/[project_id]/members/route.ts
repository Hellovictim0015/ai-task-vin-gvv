import { addProjectMember, listProjectMembers } from "@/lib/controllers";
import { handle, intParam } from "@/lib/http";

export async function GET(request: Request, { params }: { params: Promise<{ project_id: string }> }) {
  const routeParams = await params;
  return handle(() => listProjectMembers(request, intParam(routeParams.project_id, "project_id")));
}

export async function POST(request: Request, { params }: { params: Promise<{ project_id: string }> }) {
  const routeParams = await params;
  return handle(() => addProjectMember(request, intParam(routeParams.project_id, "project_id")));
}