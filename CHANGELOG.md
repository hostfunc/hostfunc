# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Added

- Generated inbound email addresses for function triggers: `{fn}-{workspace}-{random}@hostfunc.io`, sender allowlists, one-click regeneration (old address stops matching immediately), local-dev mock with a "Send test email" button, and custom-domain delivery via Resend Inbound with MX/TXT setup in the domains UI (#29).
- VS Code extension function detail views — triggers, recent versions, recent executions, and secret key names — backed by new authenticated `/api/cli/functions/*` read endpoints (#31).
- Custom domains for hosted websites with automatic SSL via Cloudflare for SaaS: add a domain, copy DNS records, live verification status (#24, #27, #28).
- Marketplace: publish functions with categories and readmes; stars, threaded comments, and forking (#22).
- Function and workspace logo uploads (PNG/JPEG/WebP/safe-SVG, 2 MB) and a delete-function flow with full cascade (#25).
- CLI browser sign-in via the OAuth device flow (RFC 8628); `--token` remains for CI/headless use.
- Integrations UI overhaul and platform polish (#23).

### Changed

- The published CLI now bundles the shared `@hostfunc/api-client`, so a global install has no dependency on unpublished workspace packages (#25).
- Web server test suite runs in full under `node:test` with the `react-server` condition; previously broken suites repaired (#30).

### Security

- Constant-time comparison for all internal service-token checks across the runtime dispatcher and control-plane internal routes (#25).
- 1 MiB inbound request body cap at the runtime edge (`413 payload_too_large`), enforced via Content-Length and a streaming guard (#25).
- Custom-domain abuse limits: 20 domains per workspace, punycode hostnames rejected, status polling throttled server-side (#25).
- SVG logo validation extended to embedded images and external `href` references (#25).

## Earlier

- Component 10 launch preparation: self-host setup gating and docker bootstrap updates, docs app scaffolding and launch writing pack, security audit and pre-flight release checklist.
