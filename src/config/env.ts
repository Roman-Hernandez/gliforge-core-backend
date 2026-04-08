import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_URL: z.string().url(),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRY: z.string().min(2),
  JWT_REFRESH_EXPIRY: z.string().min(2),
  ENCRYPTION_KEY: z
    .string()
    .regex(/^[a-fA-F0-9]{32,64}$/, "ENCRYPTION_KEY must be a hex string between 32 and 64 chars"),
  STORAGE_TYPE: z.enum(["local"]).default("local"),
  UPLOADS_DIR: z.string().min(1).default("./uploads"),
  CORS_ORIGIN: z.string().min(1),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const formatted = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("\n");

  throw new Error(`Invalid environment variables:\n${formatted}`);
}

export const env = parsedEnv.data;
