import { z } from "zod";

const envSchema = z.object({
  APP_NAME: z.string().default("AI-PS Platform"),
  APP_VERSION: z.string().default("1.0.0"),
  DEBUG: z.coerce.boolean().default(true),
  SECRET_KEY: z.string().default("changeme"),
  ALGORITHM: z.literal("HS256").default("HS256"),
  ACCESS_TOKEN_EXPIRE_MINUTES: z.coerce.number().int().positive().default(1440),

  DB_HOST: z.string().default("194.61.31.227"),
  DB_PORT: z.coerce.number().int().default(3306),
  DB_USER: z.string().default("tmgmt"),
  DB_PASSWORD: z.string().default(""),
  DB_NAME: z.string().default("tmgmt"),
  DATABASE_URL: z.string().optional(),

  REDIS_URL: z.string().default("redis://localhost:6379/0"),

  GREEN_API_INSTANCE_ID: z.string().default(""),
  GREEN_API_TOKEN: z.string().default(""),
  GREEN_API_BASE_URL: z.string().default("https://api.green-api.com"),

  // Twilio (optional)
  TWILIO_ACCOUNT_SID: z.string().default(""),
  TWILIO_AUTH_TOKEN: z.string().default(""),
  TWILIO_WHATSAPP_FROM: z.string().default("whatsapp:+14155238886"),

  // Fast2SMS
  FAST2SMS_API_KEY: z.string().default(""),
  FAST2SMS_MESSAGE_ID: z.string().default(""),
  FAST2SMS_PHONE_NUMBER_ID: z.string().default(""),

  OPENAI_API_KEY: z.string().default(""),

  EOD_REMINDER_TIME: z.string().default("17:45"),
  EOD_DEADLINE_TIME: z.string().default("18:00"),
  EOD_SUMMARY_TIME: z.string().default("19:00"),
  DAILY_TODO_TIME: z.string().default("07:00"),

  SUPER_ADMIN_NAME: z.string().default("Prakhar Bagora"),
  SUPER_ADMIN_PHONE: z.string().default("8827219873"),
  SUPER_ADMIN_EMAIL: z.string().default("prakhar@example.com"),
  SUPER_ADMIN_PASSWORD: z.string().default("Admin@123"),

  PLATFORM_URL: z.string().default("http://localhost:3000")
});

export const settings = envSchema.parse(process.env);

export const databaseUrl =
  settings.DATABASE_URL ??
  `mysql://${settings.DB_USER}:${settings.DB_PASSWORD}@${settings.DB_HOST}:${settings.DB_PORT}/${settings.DB_NAME}`;