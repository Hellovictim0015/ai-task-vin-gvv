import { handle } from "@/lib/http";
import { login } from "@/lib/controllers";
import { initDb } from "@/lib/init-db";

export async function POST(request: Request) {
  await initDb();
  return handle(() => login(request));
}
