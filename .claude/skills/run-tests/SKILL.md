---
name: run-tests
description: This skill should be used whenever the user asks to run tests, verify a fix, check that something works, or wrap up a task in the hostfunc monorepo. It picks the right runner (Vitest vs node --test), the right pnpm filter, and the right invocation for a single file/title. Trigger this whenever the user mentions tests, test failures, "did that break anything", or "let's check before committing".
---

# run-tests

## When to use

- User asks to run the test suite, a package's tests, or one test.
- User wants to verify a change before commit or PR.
- A pre-commit / CI failure mentions tests.
- User is debugging and wants `--watch` or a focused run.

## Steps

1. **Pick the scope.**
   - Whole monorepo: `pnpm test` (Turbo orchestrates per-package `test` scripts).
   - One package: `pnpm --filter @hostfunc/<pkg> test`. Examples: `@hostfunc/executor-core`, `@hostfunc/executor-cloudflare`, `@hostfunc/runtime`, `@hostfunc/cli`.
   - One file (Vitest): `pnpm --filter @hostfunc/<pkg> exec vitest <relative-path>` — e.g. `pnpm --filter @hostfunc/executor-core exec vitest test/smoke.spec.ts`.
   - One title (Vitest): `pnpm --filter @hostfunc/<pkg> exec vitest -t "<title substring>"`.
   - Watch mode: `pnpm test:watch` (everything) or `pnpm --filter @hostfunc/<pkg> exec vitest --watch`.

2. **CLI is different.** `@hostfunc/cli` uses Node's built-in test runner against built JS:
   ```
   pnpm --filter @hostfunc/cli build
   pnpm --filter @hostfunc/cli test          # = node --test dist/**/*.test.js
   ```
   Forgetting the build step is the #1 source of "my CLI test isn't picking up my change". If you edited `src/`, build first.

3. **Runtime tests live next to source.** `apps/runtime/src/*.test.ts` (e.g. `dispatch.test.ts`) — run with `pnpm --filter @hostfunc/runtime test`.

4. **Report only what matters** — pass/fail counts and the failing file. Don't dump full Vitest output unless the user asks.

## Conventions

- Vitest config is **per-package**: `packages/<pkg>/vitest.config.ts`. The include glob is typically `test/**/*.{spec,test}.ts` for `packages/*`, but inline beside source for `apps/runtime`.
- Tests use `describe(...) / it(...)` with `vitest`'s `expect`. Mocks use `vi.stubGlobal()` / `vi.fn()`. No global setup files at the moment.
- The CLI's `contract.test.ts` is an integration test against a running instance. It **silently skips** unless both `HOSTFUNC_CLI_TEST_URL` and `HOSTFUNC_CLI_TEST_TOKEN` are set. Don't be surprised when it shows 0 tests run.

## Gotchas

- **Turbo cache poisoning** can make a fixed test still appear to fail (or vice versa). If results look stale: `pnpm clean && pnpm install && pnpm test`. Less nuclear: `turbo run test --force`.
- **DB-touching tests** (currently none in CI, but if you add one) require local infra: `pnpm infra:up` first. Postgres is on **port 5433**.
- **The pre-commit hook runs `pnpm test`.** That means commits are slow but it also means a green pre-commit ≈ green CI test job.
- For `executor-cloudflare` tests, the bundler uses `data:text/javascript;base64` imports. If you see suspicious base64 in a test failure, that's by design.

## Done means

- The user got a clear pass/fail for the scope they asked about.
- If any failed, the failing test file and assertion are surfaced (don't just say "5 failed").
- If turbo cache might be lying, you've offered the `clean && test` fallback.
