# Custom domains setup (Cloudflare for SaaS)

This guide explains how custom domains work and what an operator must configure
to enable the feature in production. Until the steps below are done the feature
stays dark: the Domains settings page renders a clean "not enabled" state and the
server actions return a `not_configured` error.

Custom domains let a workspace owner serve a deployed website from their own
hostname (`www.theirsite.com`) instead of the `run.hostfunc.io/run/:org/:slug`
URL. Each domain targets exactly one deployed function. SSL is issued and renewed
automatically by Cloudflare — the end user only adds DNS records at their
registrar.

---

## How it works

```
 User registrar (Namecheap/GoDaddy/…)        hostfunc                         Cloudflare
 ─────────────────────────────────────        ───────                         ──────────
  CNAME www -> cname.hostfunc.app   ─────────────────────────────────────────►  SaaS zone
  TXT  _cf-custom-hostname … (DCV)                                              (hostfunc.app)
                                          addDomainAction ──► Custom Hostnames API ──► provisions
                                                                                      hostname + DV cert
  request https://www.theirsite.com ───────────────────────────────────────►  *  /* worker route
                                                                                      │
                                          runtime worker (apps/runtime) ◄────────────┘
                                            Host header → DOMAIN_INDEX KV → {orgSlug, fnSlug}
                                            → resolveFunctionCached → user's website
```

1. **Provision.** When a user adds a domain, [`addDomainAction`](../apps/web/src/app/dashboard/settings/domains/actions.ts)
   inserts a `custom_domain` row and calls the Cloudflare Custom Hostnames API via
   [`CloudflareCustomHostnames`](../packages/executor-cloudflare/src/custom-hostnames.ts).
   Cloudflare returns the DNS records (CNAME + TXT DCV) the user must add.
2. **Verify.** The Domains UI polls
   [`/api/workspace/domains/[domainId]/status`](../apps/web/src/app/api/workspace/domains/[domainId]/status/route.ts),
   which re-fetches the hostname from Cloudflare and maps its lifecycle onto our
   status enum: `pending_dns → pending_ssl → active` (or `failed`).
3. **Route.** The first time a domain becomes `active`,
   [`refreshDomainStatus`](../apps/web/src/server/custom-domains.ts) writes a
   `DOMAIN_INDEX` KV entry mapping the hostname → `{ orgSlug, fnSlug }`. The
   runtime worker ([`apps/runtime/src/dispatch.ts`](../apps/runtime/src/dispatch.ts))
   looks up the incoming `Host` header in that KV and serves the matching website
   from the domain root. The KV entry is written **only when active** so an
   unvalidated hostname is never routed.

### Data model

`custom_domain` (migration `0016_*`): `orgId`, `fnId` (target website),
`hostname` (globally unique), `cfHostnameId`, `status`, `sslStatus`,
`dcvRecords`, `ownershipVerification`, `lastError`. See
[`packages/db/src/schema/customDomains.ts`](../packages/db/src/schema/customDomains.ts).

---

## Prerequisites

- **Cloudflare for SaaS** entitlement on the account. This is a paid add-on,
  separate from Workers for Platforms. Custom Hostnames require an entitled zone.
- A **dedicated zone** to host custom hostnames — these instructions assume
  `hostfunc.app`. Do **not** reuse `hostfunc.io` (its `run.hostfunc.io/*` worker
  route and platform records should not mix with user-owned hostnames).

---

## One-time setup

### 1. Add the SaaS zone

Add `hostfunc.app` to the same Cloudflare account, and complete nameserver
delegation so the zone is Active.

### 2. Enable Cloudflare for SaaS on the zone

In the zone's **SSL/TLS → Custom Hostnames**, set the **Fallback origin** to a
record in the zone, e.g. `fallback.hostfunc.app`. Create that DNS record
(proxied) so it resolves and shows Active. Custom Hostnames require a fallback
origin even though the wildcard worker route intercepts requests before origin.

### 3. Create the user-facing CNAME target

Create a proxied record `cname.hostfunc.app` in the zone. This is the value users
CNAME their subdomain to. It is surfaced to users via `CF_SAAS_CNAME_TARGET`
(default `cname.hostfunc.app`).

### 4. Create the DOMAIN_INDEX KV namespace

```bash
pnpm --dir apps/runtime exec wrangler kv namespace create DOMAIN_INDEX
```

Record the returned namespace id. It is needed in two places:

- `apps/runtime/wrangler.toml` — the `DOMAIN_INDEX` binding for the runtime worker
  (replace `REPLACE_WITH_STAGING_DOMAIN_INDEX_KV_ID` / `REPLACE_WITH_PROD_DOMAIN_INDEX_KV_ID`).
- `apps/web` env — `CF_DOMAIN_INDEX_KV_ID`, so the control plane can write index
  entries when a domain goes active.

Both must point at the **same** namespace.

### 5. Add the wildcard worker route

In `apps/runtime/wrangler.toml`, the production env already declares:

```toml
{ pattern = "*/*", zone_name = "hostfunc.app" }
```

This sends every onboarded custom hostname to the runtime worker. For staging,
uncomment the equivalent `staging.hostfunc.app` route once a staging SaaS zone is
entitled. Keep `run.hostfunc.io` / `staging-run.hostfunc.io` routes as-is.

### 6. Extend the Cloudflare API token

The existing `CF_API_TOKEN` (already used for script uploads + KV) must also be
scoped, on the `hostfunc.app` zone, with:

- **Zone → SSL and Certificates → Edit** (custom hostnames + certs)
- **Zone → Zone → Read**

KV write permission for the new namespace is already covered by the account-level
Workers KV Storage edit scope the token uses today.

### 7. Set the web env vars

Set these wherever `apps/web` runs (Vercel + local `.env.local`). Template lives
in `apps/web/.env.example`.

| Variable | Value | Notes |
|---|---|---|
| `CF_SAAS_ZONE_ID` | zone id of `hostfunc.app` | **Feature gate** — unset = feature hidden |
| `CF_SAAS_CNAME_TARGET` | `cname.hostfunc.app` | shown to users; defaulted |
| `CF_SAAS_FALLBACK_ORIGIN` | `fallback.hostfunc.app` | informational |
| `CF_DOMAIN_INDEX_KV_ID` | KV namespace id from step 4 | must match runtime binding |

`isCustomDomainsConfigured()` requires `CF_SAAS_ZONE_ID`, `CF_API_TOKEN`, and
`CF_DOMAIN_INDEX_KV_ID` to all be present.

### 8. Apply the database migration

```bash
pnpm db:migrate    # local Postgres on port 5433
```

In production, run migrations as part of the normal release. Migration
`0016_*` creates the `custom_domain` table (new table only — safe to apply).

### 9. Deploy

Deploy `apps/web` and `apps/runtime` (CI deploys workers on merge to `main` for
staging, on a `v*` tag for production). Confirm the runtime worker picked up the
`DOMAIN_INDEX` binding and the `hostfunc.app` route.

---

## Verifying end to end

1. In the dashboard, open **Workspace Settings → Domains** and confirm the page is
   enabled (not the "not enabled" state).
2. Add a subdomain you control (e.g. `test.yourdomain.com`) and pick a deployed
   website.
3. Add the CNAME + TXT records shown at your registrar.
4. Watch the status move **Add DNS records → Issuing SSL → Live** (auto-polls; use
   "Check now" to force a refresh).
5. Visit `https://test.yourdomain.com` — the website should render with a valid
   certificate and working relative asset links.
6. Remove the domain and confirm it stops routing and frees the hostname.

To confirm the routing entry was written:

```bash
pnpm --dir apps/runtime exec wrangler kv key get "test.yourdomain.com" \
  --namespace-id <DOMAIN_INDEX_ID>
# => {"orgSlug":"…","fnSlug":"…"}
```

---

## Troubleshooting

- **Page shows "not enabled".** `CF_SAAS_ZONE_ID` (or `CF_API_TOKEN` /
  `CF_DOMAIN_INDEX_KV_ID`) is unset on `apps/web`.
- **Add fails with "Cloudflare rejected that domain".** The API token lacks the
  SSL/Custom Hostnames scope on `hostfunc.app`, or the zone isn't entitled for
  Cloudflare for SaaS. Check the `last_error` column on the `custom_domain` row.
- **Stuck on "Issuing SSL".** Normal for a few minutes. If it persists, verify the
  TXT DCV record is published and resolves; certificate issuance retries
  automatically.
- **"Live" but the site 404s with `domain_not_configured`.** The `DOMAIN_INDEX`
  binding id in `wrangler.toml` doesn't match `CF_DOMAIN_INDEX_KV_ID`, so the web
  app wrote to a different namespace than the worker reads. Make them identical.
- **Apex domain won't connect.** Root domains can't CNAME. Use the registrar's
  ALIAS/ANAME/flattening to `cname.hostfunc.app`, or point `www` and add an apex
  redirect.

---

## Security notes

- The `DOMAIN_INDEX` route entry is written **only** on the transition to
  `active`, so a hostname is never served before Cloudflare verifies ownership.
- `hostname` is globally unique (`custom_domain_hostname_unique`), so two
  workspaces can't claim the same host; the conflict surfaces as "already in use".
- The API token's custom-hostname scope is limited to the `hostfunc.app` zone.
