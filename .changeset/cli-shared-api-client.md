---
"@hostfunc/cli": minor
---

`hostfunc login` now signs you in through your browser by default (OAuth device flow, RFC 8628) —
no API token to copy and paste. Pass `--token <token>` to keep the previous headless/CI behavior.

Internally, the CLI now consumes the shared `@hostfunc/api-client` transport instead of its own
inline `fetch` wrapper; the request/response contract is unchanged and now lives in one place shared
with the VS Code extension.
