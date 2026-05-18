# hostfunc

Open-source platform for tiny, composable TypeScript functions. Users write a single exported `main()` and deploy in seconds; the platform handles bundling, deployment, secret injection, scheduling, and observability.

## Stack

- **Monorepo**: pnpm 9.15 workspaces + Turborepo. Node ≥22.
- **Apps**: `apps/web` and `apps/docs` (Next.js 16 + React 19); `apps/runtime`, `apps/cron`, `apps/email`, `apps/tail`, `apps/outbound` (Cloudflare Workers via Wrangler).
- **Packages**: `@hostfunc/db` (Drizzle + Postgres), `@hostfunc/executor-core` (backend interface), `@hostfunc/executor-cloudflare` (Workers implementation), `@hostfunc/sdk` (public user SDK), `@hostfunc/cli` (public `hostfunc` binary), `@hostfunc/mcp-tools`.
- **Lint+Format**: Biome (single tool — replaces ESLint + Prettier).
- **TypeScript**: strict, plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`. Project references with `composite: true`.
- **Tests**: Vitest in most packages; `node --test` in the CLI (against built `dist/`).
- **Auth**: better-auth with magic-link, GitHub/Google, and organizations plugin.
- **DB**: Drizzle ORM on PostgreSQL 16. Local Postgres runs on **port 5433**, not 5432.

## Commands

| Task | Command |
|------|---------|
| Install | `pnpm install` |
| Bring up local infra (Postgres+Redis) | `pnpm infra:up` |
| First-time setup | `pnpm setup` (install + infra + build + migrate) |
| Dev (everything) | `pnpm dev` |
| Dev (web only) | `pnpm dev:web` |
| Dev (docs only) | `pnpm dev:docs` |
| Build all | `pnpm build` |
| Build web specifically | `pnpm web:build` (runs `build:deps` then `next build`) |
| Lint | `pnpm lint` (= `biome check .`) |
| Lint + auto-fix | `pnpm lint:fix` |
| Format | `pnpm format` |
| Typecheck | `pnpm typecheck` |
| Test all | `pnpm test` |
| Test watch | `pnpm test:watch` |
| Test one package | `pnpm --filter @hostfunc/executor-core test` |
| Test one file | `pnpm --filter @hostfunc/executor-core exec vitest test/bundler.spec.ts` |
| Test one title | `pnpm --filter @hostfunc/executor-core exec vitest -t "<title>"` |
| DB: generate migration | `pnpm db:generate` |
| DB: apply migrations | `pnpm db:migrate` |
| DB: studio | `pnpm db:studio` |
| Add changeset | `pnpm changeset` (required for `@hostfunc/sdk` and `@hostfunc/cli`) |

## Architecture

- **Web (`apps/web`)** is the control plane: dashboard, marketing pages, API routes, server actions, auth. It owns the database via Drizzle.
- **Runtime (`apps/runtime`)** is the Cloudflare Worker edge router — `/run/:owner/:slug` validates the request, enforces limits, and routes through to the user's deployed function.
- **ExecutorBackend** (`packages/executor-core`) is the pluggable interface (`deploy`, `execute`, `delete`, `logs`, `health`). `packages/executor-cloudflare` is the current implementation; the abstraction exists so AWS/Deno backends can slot in later.
- **DB schemas** live in `packages/db/src/<area>.ts` (auth, organizations, functions, triggers, executions, secrets, billing, github, marketplace). Migrations live in `packages/db/migrations/`.
- **Server actions** (`"use server"`) handle mutations from the dashboard. **API routes** handle REST clients, webhooks, and MCP.
- **Auth helpers** `requireSession()` / `requireActiveOrg()` are exported from `apps/web/src/lib/auth.ts`; use them at the top of every server action and protected API route.
- **Secrets** use envelope encryption (a single `SECRETS_MASTER_KEY` wraps per-secret DEKs). Never log decrypted secret values.
- **Turbo's `^build` dependency graph** means a package's build depends on its workspace deps building first. `pnpm --filter @hostfunc/web build:deps` builds the chain (`db`, `executor-core`, `executor-cloudflare`, `mcp-tools`, `sdk`) before the Next build.

## Conventions

Biome enforces most style (2-space indent, 100 col, double quotes, trailing commas all, semicolons, import organisation). The conventions Biome can't enforce:

- **File names**: components `PascalCase.tsx`; everything else `kebab-case.ts`; Next.js routes use the framework names (`route.ts`, `page.tsx`, `layout.tsx`, `loading.tsx`).
- **Path aliases**: `@/...` resolves to `apps/web/src/...` inside the web app. Cross-package via `@hostfunc/<pkg>`.
- **Type imports**: `verbatimModuleSyntax` is on. Type-only imports must be `import type { X } from "..."`, and type-only exports must be `export type { X }`. Mixed imports use `import { foo, type Bar } from "..."`.
- **Array access**: `noUncheckedIndexedAccess` is on. `arr[i]` narrows to `T | undefined`. Either guard or use `arr.at(i)` and narrow.
- **Optional props**: `exactOptionalPropertyTypes` is on. Don't pass `undefined` to an optional property — omit the property entirely.
- **Errors**: throw typed error classes (`HostFuncError` with `code`, `IntegrationConfigError`). No Result-type pattern. Catch only where you can recover.
- **DB access**: write Drizzle inline in server actions / API routes for small queries; extract reusable queries to `apps/web/src/server/*.ts`. Don't drop down to raw SQL outside of migrations.
- **UI**: shadcn-style primitives in `apps/web/src/components/ui/`, feature components in `apps/web/src/components/<feature>/`. Use the `cn()` helper from `apps/web/src/lib/utils.ts`. Variants via `class-variance-authority`. Toasts via `sonner`. Icons from `lucide-react`. Theme via `next-themes` (dark is default).
- **Commits**: Conventional Commits with scope — `feat(web):`, `fix(runtime):`, `fix(ci):`, `chore:`, `docs:`. Enforced by `commitlint` in the `commit-msg` hook.
- **Branches**: `<type>/<kebab-description>` — `feat/...`, `fix/...`, `hotfix/...`, `chore/...`, `docs/...`.

## Definition of done

Before declaring a task complete:

1. `pnpm lint` (or `pnpm lint:fix`) is clean.
2. `pnpm typecheck` is clean.
3. `pnpm test` (or a `--filter`-scoped equivalent) passes for everything you touched.
4. Behaviour changes are accompanied by a test (Vitest for packages/runtime; `node --test` for the CLI).
5. New runtime dependencies are flagged explicitly — `@hostfunc/sdk` and `@hostfunc/cli` are published packages, so dep changes there need a changeset (`pnpm changeset`).

The husky `pre-commit` hook runs `gitleaks protect --staged` then `pnpm test`. Commits will be slow. **Do not bypass with `--no-verify`** — fix the underlying issue.

## Gotchas

- **Next.js 16 is not the Next.js you may have seen in training data.** Read `apps/web/AGENTS.md` and consult `node_modules/next/dist/docs/` before writing Next code. Heed any deprecation notices the framework emits.
- **Web build needs deps built first**: `pnpm --filter @hostfunc/web build:deps` before `pnpm --filter @hostfunc/web build`. CI does this for you; locally you need it after a clean install.
- **Stripe placeholders**: the web prerender step needs Stripe env vars even when stubbed — see the recent `fix(ci): add stripe placeholder env for web prerender build` commit.
- **Local Postgres on port 5433**, not 5432 (avoids conflict with system installs). See `docker-compose.yml`.
- **Runtime tokens must match** across `apps/web`, `apps/cron`, `apps/tail`: `RUNTIME_INVOKE_TOKEN`, `RUNTIME_INGEST_TOKEN`, `TRIGGER_CONTROL_TOKEN`. Comparison is plaintext.
- **`SECRETS_MASTER_KEY`** must be 32 bytes base64-encoded (44 chars). Generate: `openssl rand -base64 32`.
- **CF Workers for Platforms** (Dispatch namespaces) is a paid add-on. Local dev uses placeholders; deploys need real namespace IDs.
- **CLI tests** live next to source as `*.test.ts`, but run against built `dist/`. Always `pnpm --filter @hostfunc/cli build` before `node --test dist/**/*.test.js`.

## What NOT to do

- Don't introduce ESLint or Prettier — Biome is the single source of truth.
- Don't use `any` (Biome errors). Use `unknown` and narrow.
- Don't leave `console.log` in shipped code — Biome warns. Use structured logging or remove the statement.
- Don't import a value when you only need its type — `verbatimModuleSyntax` requires `import type`.
- Don't write raw SQL outside `packages/db/migrations/`. Use Drizzle.
- Don't commit secrets — `gitleaks` will block locally and in CI.
- Don't bypass git hooks with `--no-verify`. Fix what's failing.
- Don't add dependencies to `@hostfunc/sdk` or `@hostfunc/cli` without a changeset — these are published.
- Don't edit a migration in `packages/db/migrations/` after it's shipped. Write a new one.
