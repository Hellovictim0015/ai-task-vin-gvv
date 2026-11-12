import { listDepartments } from "@/lib/controllers";
import { handle } from "@/lib/http";

export async function GET() {
  return handle(() => listDepartments());
}
