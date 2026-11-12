import { adminResetPassword } from "@/lib/controllers";
import { handle, intParam } from "@/lib/http";

// Super Admin only: set a new password for any user
export async function POST(request: Request, { params }: { params: Promise<{ user_id: string }> }) {
  const routeParams = await params;
  return handle(() => adminResetPassword(request, intParam(routeParams.user_id, "user_id")));
}
