# API & workspace subdomains

How to stand up two `hostfunc.io` subdomains:

1. **`api.hostfunc.io`** — a clean public edge for the backend API (the
   `apps/web` REST/CLI/webhook routes). **Live-ready** — DNS + Vercel only.
2. **`<workspace>.hostfunc.io`** — a vanity subdomain a **Team-tier** workspace
   can claim from its slug. The slug rules are **enforced in code today**; the DNS
   wildcard + routing are an operator/feature step described below.

Companion docs:
- [`ops/production-env-matrix.md`](../production-env-matrix.md) — DNS baseline + variable inventory
- [`ops/runbooks/launch-hostfunc-io.md`](launch-hostfunc-io.md) — first-time `hostfunc.io` provisioning
- [`docs/custom-domains-setup.md`](../../docs/custom-domains-setup.md) — per-function custom hostnames (the routing pattern reused below)

---

## Part A — `api.hostfunc.io`

### What it fronts

`api.hostfunc.io` is an **alias of the Vercel `hostfunc-web` project**. It exposes
the same `apps/web/src/app/api/*` routes that already serve `app.hostfunc.io/api/*`
(CLI deploy/run, webhooks, public REST, MCP). Nothing new is deployed — it is a
second hostname on the existing project, so external clients get a clean
`https://api.hostfunc.io/...` base instead of `https://app.hostfunc.io/api/...`.

### Supabase stays private

The backend datastore is **Supabase Postgres**, reached only through `DATABASE_URL`
(the pooled `…pooler.supabase.com:6543?pgbouncer=true` connection) from the
`apps/web` server. `api.hostfunc.io` does **not** expose Supabase, PostgREST, or
the database to the public — it terminates at the Next.js API layer, which is the
only thing that holds DB credentials. Do **not** point `api.hostfunc.io` at
Supabase directly. (Exposing the DB layer publicly would be Supabase's own
[custom-domain add-on](https://supabase.com/docs/guides/platform/custom-domains)
on the project host — out of scope here and not how hostfunc serves its API.)

### 1. DNS

In the `hostfunc.io` Cloudflare zone, add:

| Name | Type | Value | Proxy |
|---|---|---|---|
| `api` | CNAME | `cname.vercel-dns.com` | DNS only |

Use **DNS only** (grey cloud) — Vercel terminates TLS and must own the cert, same
as `app` / `www`. For staging, add `staging-api → cname.vercel-dns.com` if you want
the alias there too.

### 2. Vercel

In the `hostfunc-web` project → **Settings → Domains → Add** `api.hostfunc.io`.
Vercel issues the certificate once the CNAME resolves. No redirect — serve it as a
primary alias so `app` and `api` both render the app (the app's API routes are what
matters on `api`).

### 3. App config

- **CORS.** If browser or third-party clients will call the API cross-origin, add
  `https://api.hostfunc.io` to `ALLOWED_ORIGINS` (and `MCP_ALLOWED_ORIGINS` for the
  MCP endpoint) on the `apps/web` Vercel env. See `ops/production-env-matrix.md`.
- **Auth.** Leave `BETTER_AUTH_URL` pointed at `app.hostfunc.io` — auth/session
  cookies live on the app host. `api.hostfunc.io` is for token-authenticated API
  traffic (CLI bearer tokens, webhook signatures), not browser sessions.
- **CLI.** Users can target it with `hostfunc login --url https://api.hostfunc.io`.

### 4. Verify

```bash
# Resolves to Vercel and serves the API surface
curl -sS -i https://api.hostfunc.io/api/health | head -n 1   # expect HTTP/2 200
# Auth-gated route rejects without a token (proves it's the app API, not the DB)
curl -sS -o /dev/null -w '%{http_code}\n' https://api.hostfunc.io/api/functions  # expect 401
```

---

## Part B — Team-tier workspace subdomains (`<workspace>.hostfunc.io`)

### Who gets it

**Team tier only** — the highest paid plan (`plan.slug === "team"`, $25/mo; see
[`packages/db/src/seed/plans.ts`](../../packages/db/src/seed/plans.ts)). Free and
Pro workspaces do not get a vanity subdomain. Check the plan with
[`getOrgPlan(orgId)`](../../apps/web/src/server/plan.ts) before exposing the option.

### The slug is the subdomain — and it's validated (live)

A workspace's **slug** (its URL identifier) is what becomes the subdomain label:
`acme` → `acme.hostfunc.io`. Because the slug doubles as a public DNS label, it
must be DNS-safe and must not collide with platform hostnames. This is **enforced
in code** by the shared validator
[`workspaceSlugSchema`](../../apps/web/src/lib/workspace-slug.ts), used by both
workspace creation ([`new-workspace/actions.ts`](../../apps/web/src/app/new-workspace/actions.ts))
and rename ([`dashboard/settings/actions.ts`](../../apps/web/src/app/dashboard/settings/actions.ts)):

- lowercase letters, digits, internal hyphens only — no spaces, dots, underscores,
  accents, or other "weird characters";
- 3–63 characters, no leading/trailing hyphen, no `xn--` (punycode) prefix;
- not a **reserved name** (`RESERVED_WORKSPACE_SLUGS`) — `api`, `app`, `www`,
  `mail`, `run`, `dashboard`, `docs`, `admin`, `hostfunc`, etc. This blocklist is
  what keeps a workspace from shadowing `api.hostfunc.io` or `run.hostfunc.io`.

When adding a name to the platform's own DNS, add it to `RESERVED_WORKSPACE_SLUGS`
too, or a workspace could claim it.

### DNS — wildcard (operator step)

Add a wildcard so any onboarded workspace label resolves without per-workspace DNS:

| Name | Type | Value | Proxy |
|---|---|---|---|
| `*` | CNAME | runtime worker host (or `cname.vercel-dns.com`) | Proxied |

Specific records (`app`, `api`, `run`, `mail`, `staging*`, apex) take precedence
over the wildcard, and the reserved-slug blocklist prevents a workspace from
claiming those labels — so the two layers agree. Choose the routing target by what
a workspace subdomain should serve:

- **Runtime worker** (recommended) — reuse the custom-domains routing pattern: a
  request to `acme.hostfunc.io` hits the runtime worker, which maps the `Host`
  header to the org via a `DOMAIN_INDEX`-style lookup (`{orgSlug: "acme"}`) and
  serves that workspace's designated homepage function. This mirrors
  [`docs/custom-domains-setup.md`](../../docs/custom-domains-setup.md) but keyed by
  workspace slug instead of an arbitrary hostname.
- **Vercel** — if the subdomain should render an org-branded page from `apps/web`.

### Implementation status

| Piece | Status |
|---|---|
| Slug validation + reserved-name blocklist | **Done** (`workspace-slug.ts`) |
| Team-tier gating helper | Available (`getOrgPlan`) |
| Wildcard DNS record | Operator step (above) |
| `Host` → workspace routing (worker or Vercel) | Not built — follow the custom-domains pattern |
| Opt-in toggle in Workspace Settings | Not built |

### Verify (once routing exists)

1. On a Team workspace with slug `acme`, enable the subdomain.
2. `curl -sS -i https://acme.hostfunc.io/` serves the workspace homepage function
   with a valid wildcard certificate.
3. A reserved slug (`api`, `admin`, …) cannot be set — creation/rename returns
   "That workspace URL is reserved by hostfunc".
4. A Free/Pro workspace does not see the subdomain option.
