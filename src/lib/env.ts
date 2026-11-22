/**
 * Server-side environment validation.
 * Validates on first access (lazy) so `next build` succeeds without real keys.
 * At runtime (dev or production start), throws immediately if any required
 * variable is missing or malformed.
 *
 * NEXT_PUBLIC_* vars are safe to expose to the browser.
 * SUPABASE_SERVICE_ROLE_KEY must stay server-only — never import this in
 * client components or pass it to the browser.
 */
import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
})

export type Env = z.infer<typeof envSchema>

let _env: Env | undefined

/** Validates and returns the environment. Throws clearly on missing vars. */
export function getEnv(): Env {
  if (_env) return _env
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const missing = result.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`)
    throw new Error(
      `\n\n[env] Missing or invalid environment variables:\n${missing.join('\n')}\n\nCopy .env.example → .env.local and fill in the values.\n`,
    )
  }
  _env = result.data
  return _env
}

/**
 * Eagerly validate at import time ONLY when actually serving
 * (not during `next build` which sets NODE_ENV=production but doesn't serve).
 * During build, env vars may not be available.
 */
const isBuild = process.env.NEXT_PHASE === 'phase-production-build'
if (!isBuild) {
  getEnv()
}
