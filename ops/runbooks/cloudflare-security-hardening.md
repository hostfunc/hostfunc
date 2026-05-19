# Cloudflare Security Hardening — hostfunc.io

Closing the findings surfaced by Cloudflare's security scan. Some are already
covered in code (HSTS headers + `/.well-known/security.txt` ship with the web,
docs, and runtime workers). The remainder are dashboard/DNS-level actions an
operator has to perform — this runbook is the canonical sequence.

Companion docs:

- [`ops/runbooks/launch-hostfunc-io.md`](launch-hostfunc-io.md) — first-time provisioning
- [`apps/web/public/.well-known/security.txt`](../../apps/web/public/.well-known/security.txt) — vuln disclosure target

## Hostnames in scope

| Hostname | Cloudflare proxy | Origin | Notes |
|---|---|---|---|
| `hostfunc.io` (apex) | Orange (proxied) | Vercel | HSTS + security headers from Next |
| `www.hostfunc.io` | Grey (DNS only) | Vercel | Cloudflare toggles do **not** apply |
| `app.hostfunc.io` | Orange | Vercel | Inherits zone settings |
| `docs.hostfunc.io` | Orange | Vercel | HSTS + security headers from Next |
| `run.hostfunc.io` | Orange | CF Worker `hostfunc-runtime` | HSTS in worker code |
| `staging-run.hostfunc.io` | Orange | CF Worker `hostfunc-runtime-staging` | HSTS in worker code |

## 1. Pre-flight diagnostics

Capture ground truth before touching the dashboard. The scanner findings are a
hypothesis — verify which fixes are actually needed.

```bash
# Worker routes — should redirect 80 → 443 after zone "Always Use HTTPS" is on
curl -sI http://staging-run.hostfunc.io/run/_/_ | head -5
curl -sI https://staging-run.hostfunc.io/run/_/_ | head -10

# www — verify Vercel handles the host header (or doesn't)
curl -sI http://www.hostfunc.io/ | head -5
curl -sI https://www.hostfunc.io/ | head -10

# DMARC + MX — capture the current DNS state
dig +short TXT _dmarc.hostfunc.io
dig +short MX hostfunc.io
dig +short TXT hostfunc.io | grep -i spf
```

Record the output. If `https://staging-run.hostfunc.io` already serves with
HSTS post-PR-1 deploy, sections 2–4 are about catching the paths Cloudflare
serves directly (challenge pages, edge errors) — defense in depth.

## 2. SSL/TLS encryption mode → Full (strict)

**Sequence matters. Flipping this without a valid origin cert breaks the site.**

1. Confirm Vercel is presenting a valid TLS cert at the origin: open
   `https://hostfunc.io` in a browser, inspect the certificate. Vercel's
   automatic certs are LE-signed and valid.
2. **Optional** but recommended: install a [Cloudflare Origin Certificate](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/) at Vercel for the origin connection.
   Vercel Project → Settings → Domains → add custom cert. This makes Full
   (strict) tighter than Full (which accepts any cert).
3. Cloudflare → SSL/TLS → Overview → set encryption mode to **Full (strict)**.
4. Verify: `curl -sI https://hostfunc.io/` returns 200 with a Cloudflare
   `cf-ray` header. Open the site in an incognito window.
5. **Rollback**: if anything 5xxs, flip back to **Full** (not Flexible) and
   investigate the origin cert.

## 3. Always Use HTTPS

Cloudflare → SSL/TLS → Edge Certificates → toggle **Always Use HTTPS** to On.

This applies zone-wide and catches the `staging-run.hostfunc.io` and apex HTTP
findings. Worker-level HSTS shipped in PR 1 is the defense-in-depth fallback
for paths that miss the edge redirect.

Verify: `curl -sI http://hostfunc.io/` should return `301` with
`location: https://hostfunc.io/`.

## 4. HSTS at the zone

Cloudflare → SSL/TLS → Edge Certificates → HSTS → **Enable**.

Settings:

- Max Age: `12 months` (= `31536000`)
- Apply HSTS policy to subdomains (`includeSubDomains`): **On**
- Preload: **Off** — removal from the preload list takes 12+ months. Revisit
  after 90 days of clean operation.
- No-Sniff Header: leave the dashboard default (we set it from Next as well)

This matches what the worker and Next emit. Cloudflare's setting catches
challenge pages and edge error pages we don't otherwise control.

## 5. www.hostfunc.io — gray-clouded, needs a redirect

`www.hostfunc.io` is a DNS-only CNAME to Vercel ([launch-hostfunc-io.md:17](launch-hostfunc-io.md)) — Cloudflare's HSTS/Always-HTTPS settings do **not** apply
because the record bypasses Cloudflare's edge.

The cleanest fix: **redirect `www` → apex at Vercel** so the `www` hostname is
never served by an origin that lacks HSTS.

1. Vercel → `hostfunc-web` project → Settings → Domains.
2. Click `www.hostfunc.io` → set **Redirect** to `hostfunc.io` with status code
   `308` (permanent).
3. Verify: `curl -sI https://www.hostfunc.io/` returns `308` with
   `location: https://hostfunc.io/`.
4. Re-run the Cloudflare scan. The three `www.hostfunc.io` findings should
   drop on the next pass.

If you'd rather serve `www` directly (instead of redirecting), you have two
options, neither recommended for now:

- Orange-cloud the CNAME: only works if Vercel can be configured to accept
  Cloudflare's `Host` header without complaining. Vercel's hostname-routing
  doesn't always cooperate.
- Configure HSTS at Vercel via `next.config.ts` (we already do this — but
  Vercel needs to be serving the `www` host for it to apply).

## 6. DMARC

Cloudflare → DNS → Records → **Add record**:

- Type: `TXT`
- Name: `_dmarc`
- Content: `v=DMARC1; p=quarantine; rua=mailto:mfleming2889@gmail.com; pct=100; adkim=s; aspf=s`
- TTL: Auto
- Proxy status: DNS only

**Why `p=quarantine` not `p=reject`**: gives a week of aggregate reports
(via the `rua=` mailbox) to confirm Resend's SPF and DKIM cover every legitimate
sender. Magic-link auth (Better Auth → Resend) flows through here — `p=reject`
prematurely would bounce login emails.

After a week of clean reports, tighten:

```
v=DMARC1; p=reject; rua=mailto:mfleming2889@gmail.com; pct=100; adkim=s; aspf=s
```

Once `security@hostfunc.dev` (or a `dmarc-reports@hostfunc.dev` mailbox) is
provisioned, swap the `rua=` address.

The scan reports three DMARC findings — they all reference the same missing
record. One TXT entry resolves all three.

## 7. Bot protections

Cloudflare → Security → Bots:

1. **Block AI bots** → On. Blocks well-known AI crawlers from training on
   public marketing pages. Low risk for SEO (real search crawlers are in a
   separate list).
2. **AI Labyrinth** → On. Tarpits AI scrapers; no false-positive impact on real
   users.
3. **Bot Fight Mode** → On. Challenges automated traffic. Soak for 24h then
   check Security → Events for false positives. If real users get challenged,
   tune via custom rules before re-enabling.

## 8. Security.txt — Cloudflare dashboard

**Skip.** PR 1 serves the canonical RFC 9116 file at
[`/.well-known/security.txt`](../../apps/web/public/.well-known/security.txt).
Enabling Cloudflare's Security Center generator would either conflict with
ours or be redundant.

Verify ours is reachable after deploy:

```bash
curl -s https://hostfunc.io/.well-known/security.txt
```

## 9. Account MFA

Cloudflare → My Profile → Authentication → enable **Two-Factor Authentication**:

1. Use TOTP (authenticator app), **not** SMS.
2. Save recovery codes in 1Password (or equivalent).
3. After enabling for your own account, go to Account Home → Members →
   **Require 2FA** for all members.

## 10. Re-scan and verify

Cloudflare → Security Center → run a fresh scan. Expected outcome after this
runbook + PR 1 lands:

| Finding | Expected status |
|---|---|
| HSTS missing (`hostfunc.io`, `staging-run.hostfunc.io`) | Resolved |
| Always Use HTTPS off (`hostfunc.io`, `staging-run.hostfunc.io`) | Resolved |
| TLS missing (`staging-run.hostfunc.io`) | Resolved |
| TLS / HSTS missing (`www.hostfunc.io`) | Resolved (after §5) |
| Security.txt missing | Resolved |
| DMARC errors x3 | Resolved (after §6) |
| Block AI bots / AI Labyrinth / Bot Fight Mode | Resolved |
| MFA missing | Resolved |

Capture before/after screenshots of the Security Center dashboard and attach
to the closing PR.

## Rollback notes

- **Full (strict) breaking the origin**: flip to **Full** (not Flexible — that
  re-introduces the unencrypted hop the scanner flagged).
- **DMARC quarantining real mail**: change `p=quarantine` → `p=none`. Aggregate
  reports keep flowing without enforcement.
- **HSTS too aggressive**: max-age can be lowered. Once a browser has seen the
  header it will honor the cached value until expiry — there's no instant
  rollback for already-cached clients.
- **Bot Fight Mode false positives**: switch back to "Monitor" or disable
  entirely. The rule history is preserved.
