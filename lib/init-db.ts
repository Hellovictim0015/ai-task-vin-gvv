import { UserRole } from "./enums";
import { settings } from "./config";
import { getPasswordHash } from "./auth";
import { logger } from "./logger";
import { db } from "./data";

export async function initDb() {
  const existing = await db.user.findFirst({ where: { role: UserRole.super_admin } });
  if (existing) {
    logger.info({ name: existing.name }, "Super Admin already exists");
    return;
  }

  const admin = await db.user.create({
    data: {
      name: settings.SUPER_ADMIN_NAME,
      phone: settings.SUPER_ADMIN_PHONE,
      email: settings.SUPER_ADMIN_EMAIL,
      hashed_password: await getPasswordHash(settings.SUPER_ADMIN_PASSWORD),
      role: UserRole.super_admin,
      is_active: true
    }
  });
  logger.info({ id: admin.id, name: admin.name }, "Super Admin created");
}

