import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  API_PORT: z.coerce.number().default(3001),
  WEB_URL: z.string().default("http://localhost:5173"),
  SESSION_SECRET: z.string().default("dev-secret-change-me"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
})

export const env = envSchema.parse(process.env)
