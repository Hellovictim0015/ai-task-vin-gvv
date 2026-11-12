import { createUser, listUsers } from "@/lib/controllers";
import { handle } from "@/lib/http";

export async function GET(request: Request) {
  return handle(() => listUsers(request));
}

export async function POST(request: Request) {
  return handle(() => createUser(request));
}
