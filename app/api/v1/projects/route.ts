import { createProject, listProjects } from "@/lib/controllers";
import { handle } from "@/lib/http";

export async function GET(request: Request) {
  return handle(() => listProjects(request));
}

export async function POST(request: Request) {
  return handle(() => createProject(request));
}
