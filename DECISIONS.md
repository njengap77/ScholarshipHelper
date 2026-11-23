# Decisions & Deviations

All deliberate choices that deviate from or extend the PDF's instructions are logged here.

---

## M0 — Project Scaffold

| # | Decision | Reason |
|---|---|---|
| 1 | Scaffolded into `temp-app/` subdirectory then moved files to root | `create-next-app` refuses a project name containing capital letters (`scholarshipHelper`); moving was simpler than renaming the working directory. |
| 2 | npm cache relocated to `D:\.npm-cache` | C: drive was near-full (~1 GB free); all large binary downloads now land on D: (73 GB free). |
| 3 | Tailwind v4 (via `create-next-app@16.4.6` default) | v4 uses `@import "tailwindcss"` syntax, not `@tailwind base/components/utilities`. PDF does not specify a Tailwind minor version; v4 is the current stable release and matches the scaffolded `globals.css`. |
| 4 | `supabase` CLI omitted from `devDependencies` | The `supabase` npm package is ~500 MB of platform binaries and was a primary cause of the C: ENOSPC failure. The Supabase CLI is not needed for M0 (migration is applied manually via the SQL Editor per the PDF). It will be re-evaluated before it is actually required. |
| 5 | `@playwright/test` deferred to when E2E tests are needed | Playwright requires a separate `npx playwright install` step (large browser downloads). It is listed in devDependencies but browsers are not installed until an E2E milestone. |
| 6 | Switched build to `next build --webpack` with `@tailwindcss/postcss` | Turbopack native binary failed to load on this Windows host (WASM fallback only, which Turbopack does not support). PostCSS + Webpack cleanly builds Tailwind v4. |

---

## M1 — Accounts & Onboarding

| # | Decision | Reason |
|---|---|---|
| 7 | Added `highest_completed_level`, `skills`, `research_interests`, `certifications`, `extracurriculars`, `languages` directly to `profiles` table in `0002` | Eliminates redundant joins across tables for basic user tags and matches the Profile interface in `src/lib/eligibility/engine.ts`. |
| 8 | Installed `server-only` | Enforces at build-time that `src/lib/supabase/admin.ts` (using service role key) can never be imported into client components. |
| 9 | Excluded `**/*.test.ts` from `tsconfig.json` | Next.js production build runs `tsc` over included files. Test files use test runners and shouldn't be packaged into Next.js production output. |


