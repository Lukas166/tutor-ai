import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(32).default('tutor-ai-local-dev-secret-tutor-ai-local-dev-secret'),
  COOKIE_NAME: z.string().default('tutor_ai_token'),
})

export const env = envSchema.parse(process.env)

export const isSupabaseConfigured = Boolean(
  env.SUPABASE_URL && env.SUPABASE_ANON_KEY && env.SUPABASE_SERVICE_ROLE_KEY
)

export const isProduction = env.NODE_ENV === 'production'
