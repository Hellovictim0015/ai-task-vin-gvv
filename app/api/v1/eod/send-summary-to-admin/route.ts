import { sendEodSummaryToAdmin } from "@/lib/controllers";
import { handle } from "@/lib/http";

export async function POST(request: Request) {
  return handle(() => sendEodSummaryToAdmin(request));
}
