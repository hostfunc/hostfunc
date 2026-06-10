---
"@hostfunc/cli": minor
---

`hostfunc login` now signs you in through your browser by default (OAuth device flow, RFC 8628) —
no API token to copy and paste. Pass `--token <token>` to keep the previous headless/CI behavior.

Internally, the CLI now consumes the shared `@hostfunc/api-client` transport instead of its own
inline `fetch` wrapper; the request/response contract is unchanged and now lives in one place shared
with the VS Code extension.

The published binary now bundles the (private) `@hostfunc/api-client` package into `dist/bin.js`,
so a global `npm install -g @hostfunc/cli` has no dependency on unpublished workspace packages.
