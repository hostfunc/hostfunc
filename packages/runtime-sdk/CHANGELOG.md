# Changelog

## 0.2.0

### Minor Changes

- 3a4f836: Enforce HTTP trigger authentication by default (`requireAuth`), add `RUNTIME_INVOKE_TOKEN` for trusted control-plane invokes, email triggers with platform-generated inbound addresses and optional `email(data)` handler, inbound email normalization, dashboard curl example with copy, and related docs/ops updates.

### Patch Changes

- Updated dependencies [3a4f836]
  - @hostfunc/executor-core@0.0.1

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] - 2026-04-17

### Added

- Renamed package to `@hostfunc/sdk`.
- Added modular entrypoints: `@hostfunc/sdk`, `@hostfunc/sdk/ai`, `@hostfunc/sdk/agent`, `@hostfunc/sdk/vector`.
- Added typed core SDK surface (`executeFunction`, `secret`, runtime context helpers, `SdkError`).
- Added AI module (`askAi`, `streamAi`, `createEmbedding`).
- Added Agent module (`createAgent`, `runAgent`).
- Added Vector module (`upsert`, `query`, `deleteVectors`, `getNamespace`).
- Added tsup-based dual ESM/CJS + d.ts build output.
