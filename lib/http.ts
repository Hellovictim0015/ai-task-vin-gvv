import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "./logger";
import { settings } from "./config";

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
    public headers?: HeadersInit
  ) {
    super(detail);
  }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(status: number, detail: string, headers?: HeadersInit): never {
  throw new ApiError(status, detail, headers);
}

export async function handle(handler: () => Promise<Response>) {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ detail: error.detail }, { status: error.status, headers: error.headers });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ detail: error.errors }, { status: 422 });
    }
    logger.error({ error }, "Unhandled API error");
    if (settings.DEBUG) {
      return NextResponse.json({ detail: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined }, { status: 500 });
    }
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}

export async function readBody<T>(request: Request, schema: { parse(value: unknown): T }) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return schema.parse(Object.fromEntries(await request.formData()));
  }
  return schema.parse(await request.json());
}

export function boolQuery(value: string | null) {
  if (value == null) return undefined;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export function intParam(value: string, name: string) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) fail(400, `${name} must be an integer`);
  return parsed;
}

export function getClientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

