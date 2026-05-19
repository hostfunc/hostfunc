---
name: nextjs-conventions
description: This skill should be used whenever Claude is editing files under apps/web or apps/docs in the hostfunc monorepo. It covers Next.js 16 specifics (which differ from training data), server actions vs API routes, the auth helpers, the shadcn+Tailwind UI stack, and the build:deps quirk. Trigger this whenever the user mentions the dashboard, the web app, a route, a page, a component, an API endpoint, or anything under apps/web or apps/docs.
---

# nextjs-conventions

## When to use

- Adding or editing anything under `apps/web/` or `apps/docs/`.
- Adding a new page, route, server action, API route, layout, or component to the dashboard.
- Discussing the auth flow, the marketplace, the editor, or the settings UI.
- Touching anything that talks to better-auth or Drizzle from inside the web app.

## Steps

1. **FIRST: this is Next.js 16, not the Next.js you may have in training data.** Read `apps/web/AGENTS.md` and consult `node_modules/next/dist/docs/` for the specific feature you're using. Pay attention to deprecation notices the framework emits.

2. **Pick the right primitive.**
   - **Server Component** (default) — read-only rendering, can `await` directly, has DB access via Drizzle.
   - **Client Component** (`"use client"`) — needs interactivity, hooks, browser APIs.
   - **Server Action** (`"use server"`) — mutations from the dashboard UI. Lives in a file with a top-level `"use server"`, e.g. `apps/web/src/app/dashboard/org-actions.ts`.
   - **API Route** (`route.ts` with `GET`/`POST`/etc.) — REST clients, webhooks, MCP endpoints, anything that's not driven from our own React UI.

3. **File naming and placement.**
   - Routes: `apps/web/src/app/.../page.tsx`, `layout.tsx`, `loading.tsx`, `route.ts`. Use Next.js's own names — don't rename.
   - Components: `PascalCase.tsx`. UI primitives in `apps/web/src/components/ui/`. Feature components in `apps/web/src/components/<feature>/` (e.g. `marketplace/`, `dashboard/`, `editor/`).
   - Server-only utilities: `apps/web/src/server/*.ts` — Drizzle queries, executor wiring, integrations.
   - Pure utilities: `apps/web/src/lib/*.ts` — `cn()`, env validation, formatters.
   - Use the `@/` alias for everything inside `apps/web/src/`.

4. **Auth — always enforce at the boundary.**
   - Server actions and protected API routes start with:
     ```ts
     const session = await requireSession();
     // or
     const { orgId, ... } = await requireActiveOrg();
     ```
   - Don't roll your own session lookup. Use the helpers from `apps/web/src/lib/auth.ts`.
   - The client uses `useSession()` / `useActiveOrganization()` from `apps/web/src/lib/auth-client.ts`.

5. **Database access.**
   - Import `db` and `schema` from `@hostfunc/db`.
   - Small queries inline in the action / route. Reusable queries extracted to `apps/web/src/server/*.ts`.
   - Use Drizzle's typed query builder — `db.select(...).from(...).where(eq(...))`. No raw SQL.
   - Don't bypass org scoping. Every multi-tenant query has `where(eq(schema.X.organizationId, orgId))`.

6. **UI.**
   - shadcn-style primitives from `apps/web/src/components/ui/` — `Button`, `Card`, `Dialog`, `Badge`, etc. Use them; don't reinvent.
   - Tailwind 4 utilities + `cva` for variants. Compose classes with `cn()` from `apps/web/src/lib/utils.ts`.
   - Icons: `lucide-react`. Toasts: `sonner`. Theme: `next-themes` (dark default).

7. **Errors.** Throw typed errors (e.g. `IntegrationConfigError`). Server actions surface them to the client; API routes map them to HTTP status codes. Don't return Result-shaped objects.

8. **Build.** The web app's build needs its workspace deps built first:
   ```
   pnpm --filter @hostfunc/web build:deps
   pnpm --filter @hostfunc/web build
   ```
   `pnpm web:build` from the root does both. Locally you usually don't need this — `pnpm dev` watches deps via Turbo.

## Conventions

- Default to Server Components. Add `"use client"` only when you actually need browser-only state or effects.
- Co-locate server actions with the route that uses them (e.g. `apps/web/src/app/dashboard/org-actions.ts` next to `apps/web/src/app/dashboard/page.tsx`).
- API routes use `Response.json(...)` and `NextRequest`. Return `Response.json(..., { status: 400 })` for client errors.
- Logging is currently `console.log` / `console.error` (Biome warns; consider it intentional for now). Long-term we'll move to structured logs — don't introduce a new logger lib mid-task.
- Don't import server-only modules into client components — Next will surface this at build time, but catch it earlier.

## Gotchas

- **Next.js 16 breaking changes.** Async `params`, async `cookies()` / `headers()`, route handler signatures — these all changed. Always check the in-tree docs.
- **Stripe env vars for prerender.** The build step needs Stripe placeholder env vars even when Stripe is stubbed. See the `fix(ci): add stripe placeholder env for web prerender build` commit for the canonical list.
- **`build:deps` is required** after a fresh `pnpm install` or branch switch. CI does this for you.
- **Monaco editor** lives under `apps/web/src/components/editor/`. It's heavy — don't import it eagerly from a Server Component; dynamically import on the client side.
- **Three.js** is used in marketing pages — also heavy, also client-only.
- **better-auth's organization plugin** — `useActiveOrganization()` returns the currently-active org, which may be `null` mid-load. Always guard.

## Done means

- All the right files are in the right places (`page.tsx` / `route.ts` / `*-actions.ts`).
- Auth is enforced at the top of every server action / protected API route.
- DB queries are typed Drizzle and org-scoped where applicable.
- UI uses existing primitives from `apps/web/src/components/ui/`.
- `pnpm --filter @hostfunc/web typecheck` is clean and a relevant `pnpm --filter @hostfunc/web ...` smoke runs.
