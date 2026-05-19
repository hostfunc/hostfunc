---
name: debug-failing-test
description: This skill should be used whenever a test is failing or flaky in the hostfunc monorepo. It walks through narrowing down the failing test, dealing with Turbo cache, the build-then-test quirk in the CLI, the Vitest mocking patterns used here, and infra-dependency gotchas. Trigger this whenever the user mentions a failing test, a flake, "the test is broken", or a Vitest/Node test error.
---

# debug-failing-test

## When to use

- A `pnpm test` run failed.
- A previously-passing test started failing.
- A test passes locally but fails in CI (or vice versa).
- The user says "test is flaky" or "I can't figure out why this test fails".

## Steps

1. **Narrow the scope.** Identify the failing package from the output:
   ```
   pnpm --filter @hostfunc/<pkg> test
   ```
   Then narrow to a single file:
   ```
   pnpm --filter @hostfunc/<pkg> exec vitest test/<file>.spec.ts
   ```
   Then a single title:
   ```
   pnpm --filter @hostfunc/<pkg> exec vitest -t "<title substring>"
   ```

2. **Read the actual error**, not the surrounding noise. Vitest dumps a lot — the lines that matter are the `AssertionError` / `Error:` and the file:line of the throw.

3. **Rule out cache.** If the test looks correct and the failure makes no sense:
   ```
   pnpm clean && pnpm install && pnpm --filter @hostfunc/<pkg> test
   ```
   Less nuclear: `turbo run test --force --filter=@hostfunc/<pkg>`. Turbo's cache key is content-based, but cross-package builds (`^build`) can lag if you toggled branches.

4. **For `@hostfunc/cli`: rebuild before re-running.** The CLI's tests run against `dist/`, not `src/`:
   ```
   pnpm --filter @hostfunc/cli build
   pnpm --filter @hostfunc/cli test
   ```
   Symptom of forgetting this: "I changed X but the test still asserts the old behaviour."

5. **For `@hostfunc/cli` contract tests** (`src/contract.test.ts`): they silently skip without `HOSTFUNC_CLI_TEST_URL` and `HOSTFUNC_CLI_TEST_TOKEN`. If you expected them to run and they didn't, set both env vars to a live instance.

6. **For `executor-cloudflare` bundler tests**: the bundler emits a `data:text/javascript;base64,...` import and the test executes the bundle. Failures often mean the bundle output changed in a way the assertion didn't expect. Re-read `test/bundler.spec.ts` carefully — the test data is intentionally brittle to catch regressions in the bundler output.

7. **For `apps/runtime` dispatch tests**: mocks use `vi.stubGlobal('fetch', ...)`. If you see a real network call hitting a real URL in the test output, the stub isn't covering the code path you added.

8. **For DB tests** (if any are added later): local Postgres must be up on **port 5433** — `pnpm infra:up`. If it's not running, the connection error will be on `127.0.0.1:5433`, not `:5432`.

9. **CI-only failure.** If it passes locally but fails in CI:
   - CI runs `pnpm test` from a fresh `pnpm install` and a clean Turbo cache. Reproduce locally with `pnpm clean && pnpm install && pnpm test`.
   - CI sets specific env vars (see `.github/workflows/ci.yml`). Stripe placeholder env vars are needed for the `web-build` prerender — but tests shouldn't need them.
   - CI runs on Linux; tests should not depend on macOS-specific behaviour.

10. **Local-only failure.** Often a stale `node_modules` or stray local env. `pnpm install` first; if that doesn't help, `pnpm clean && pnpm install`.

## Conventions

- Don't disable a failing test to make CI green. Fix it or `it.skip(...)` it with a `// TODO(<owner>): re-enable after <thing>` comment and surface the skip to the user.
- Don't add a `setTimeout` to "fix" a flake — find the real race.
- Don't introduce new mocking libraries. Vitest's `vi.fn` / `vi.stubGlobal` is the pattern.
- Don't change a test to match buggy code. The test is asserting intended behaviour; if the behaviour is wrong, fix the source.

## Gotchas

- **`composite: true` + project references**: a typecheck-style error inside a test (`Cannot find module '@hostfunc/<dep>'`) usually means the dep hasn't been built. `pnpm --filter @hostfunc/<dep> build` or just `pnpm build`.
- **`verbatimModuleSyntax`** means a missing `import type` will fail the package's typecheck, which can cascade into the test run failing to compile.
- **Turbo will skip a `test` task if its inputs haven't changed** even if you think it should run. Use `--force` if you suspect a stale cache hit.
- **The CLI's `node --test` runner** doesn't have title filtering — to focus, use Node's `--test-name-pattern="<pattern>"` flag or temporarily skip the others.

## Done means

- The failing test is now passing (or correctly `.skip(...)`'d with a comment and a follow-up flagged to the user).
- The root cause is named, not just the symptom.
- If the cache was the culprit, the user knows so they don't burn time on it next time.
