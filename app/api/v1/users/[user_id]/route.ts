import { deactivateUser, getUserById, updateUser } from "@/lib/controllers";
import { handle, intParam } from "@/lib/http";

export async function GET(request: Request, { params }: { params: Promise<{ user_id: string }> }) {
  const routeParams = await params;
  return handle(() => getUserById(request, intParam(routeParams.user_id, "user_id")));
}

export async function PUT(request: Request, { params }: { params: Promise<{ user_id: string }> }) {
  const routeParams = await params;
  return handle(() => updateUser(request, intParam(routeParams.user_id, "user_id")));
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ user_id: string }> }
) {
  const routeParams = await params;
  return handle(() =>
    deactivateUser(request, intParam(routeParams.user_id, "user_id"))
  );
}