import { compare, hash } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { UserRole } from "./enums";
import { db } from "./data";
import { settings } from "./config";
import { fail } from "./http";

const secret = new TextEncoder().encode(settings.SECRET_KEY);

export async function verifyPassword(plainPassword: string, hashedPassword: string) {
  return compare(plainPassword, hashedPassword);
}

export async function getPasswordHash(password: string) {
  return hash(password, 12);
}

export async function createAccessToken(data: { sub: string; role: string }) {
  return new SignJWT(data)
    .setProtectedHeader({ alg: settings.ALGORITHM })
    .setExpirationTime(`${settings.ACCESS_TOKEN_EXPIRE_MINUTES}m`)
    .sign(secret);
}

export async function decodeToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: [settings.ALGORITHM] });
    return payload as { sub?: string; role?: string };
  } catch {
    return null;
  }
}

export async function currentUser(request: Request) {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  if (!token) fail(401, "Not authenticated", { "WWW-Authenticate": "Bearer" });
  const payload = await decodeToken(token);
  if (!payload?.sub) fail(401, "Invalid or expired token", { "WWW-Authenticate": "Bearer" });
  const user = await db.user.findFirst({
    where: { id: Number(payload.sub) },
    include: { department: true }
  });
  if (!user || !user.is_active) fail(401, "User not found or inactive");
  return user;
}

export async function requireSuperAdmin(request: Request) {
  const user = await currentUser(request);
  if (user.role !== UserRole.super_admin) fail(403, "Super Admin access required");
  return user;
}

export async function requireAdminOrAbove(request: Request) {
  const user = await currentUser(request);
  const allowed = [UserRole.super_admin, UserRole.admin, UserRole.project_head, UserRole.department_head];
  if (!allowed.includes(user.role)) fail(403, "Admin access required");
  return user;
}

export async function requireProjectHeadOrAbove(request: Request) {
  const user = await currentUser(request);
  const allowed = [UserRole.super_admin, UserRole.admin, UserRole.project_head];
  if (!allowed.includes(user.role)) fail(403, "Project Head access required");
  return user;
}

