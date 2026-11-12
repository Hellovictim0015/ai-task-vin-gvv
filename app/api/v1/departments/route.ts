import { createDepartment, listDepartments } from "@/lib/controllers";
import { handle } from "@/lib/http";

export async function GET() {
  return handle(() => listDepartments());
}

export async function POST(request: Request) {
  return handle(() => createDepartment(request));
}
