import { deleteDepartment, updateDepartment } from "@/lib/controllers";
import { handle, intParam } from "@/lib/http";

export async function PUT(request: Request, { params }: { params: Promise<{ department_id: string }> }) {
  const routeParams = await params;
  return handle(() => updateDepartment(request, intParam(routeParams.department_id, "department_id")));
}

export async function DELETE(request: Request, { params }: { params: Promise<{ department_id: string }> }) {
  const routeParams = await params;
  return handle(() => deleteDepartment(request, intParam(routeParams.department_id, "department_id")));
}
