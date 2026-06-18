# @hostfunc/cli

## 0.3.1

### Patch Changes

- 40a74f8: Default `hostfunc init` and `hostfunc login` to the production API (`https://app.hostfunc.io`) when no `--url` is given, instead of `http://localhost:3000`. Local development can still target a local control plane with `--url http://localhost:3000`.

## 0.3.0

### Minor Changes

- 8397eb5: `hostfunc login` now signs you in through your browser by default (OAuth device flow, RFC 8628) —
  no API token to copy and paste. Pass `--token <token>` to keep the previous headless/CI behavior.

  Internally, the CLI now consumes the shared `@hostfunc/api-client` transport instead of its own
  inline `fetch` wrapper; the request/response contract is unchanged and now lives in one place shared
  with the VS Code extension.

  The published binary now bundles the (private) `@hostfunc/api-client` package into `dist/bin.js`,
  so a global `npm install -g @hostfunc/cli` has no dependency on unpublished workspace packages.

## 0.2.0

### Minor Changes

- 0a44cdc: Finalize the CLI for public npm release with stricter UX, packaging metadata, contract and smoke tests, and release workflow guardrails.
