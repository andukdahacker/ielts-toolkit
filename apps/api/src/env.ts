import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

export const envSchema = z.object({
  DATABASE_URL: z.string(),
  GEMINI_API_KEY: z.string(),
  GOOGLE_CLIENT_ID: z.string(),
  POLAR_WEBHOOK_SECRET: z.string(),
  ALLOWED_ORIGINS: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  PORT: z.coerce.number().default(3000),
})

export type Env = z.infer<typeof envSchema>
export const envJsonSchema = zodToJsonSchema(envSchema)
