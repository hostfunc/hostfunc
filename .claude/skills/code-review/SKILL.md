---
name: code-review
description: This skill should be used whenever the user asks for a code review, sanity check, pre-PR scrub, or "is this ready". It runs the same gates that CI runs, plus the conventions Biome can't enforce on its own. Trigger this whenever the user mentions review, "look this over", "ready to ship", "ready for PR", or wraps up a non-trivial change.
---

# code-review

## When to use

- User asks for a review of pending changes.
- User says "I'm done — anything I missed?" or "ready to push?".
- Before opening a PR (pair with the `commit-and-pr` skill).
- After a non-trivial refactor or new feature.

## Steps

1. **Identify the change set.** `git status` + `git diff` (staged + unstaged) + `git diff main...HEAD` if on a branch. Read every modified file in full before commenting.

2. **Run the CI gates locally** (these are what `.github/workflows/ci.yml` runs):
   - `pnpm lint` — Biome lint. Fix with `pnpm lint:fix` for auto-fixable issues.
   - `pnpm typecheck` — Turbo over per-package `typecheck` scripts.
   - `pnpm test` — Or scope down via `--filter` if the change is contained.
   - If web changed: `pnpm --filter @hostfunc/web build:deps && pnpm --filter @hostfunc/web build`.
   - If CLI changed: `pnpm --filter @hostfunc/cli build && pnpm --filter @hostfunc/cli test` and consider `pnpm --filter @hostfunc/cli smoke:pack`.

3. **Check the conventions Biome doesn't catch:**
   - **Type imports**: every type-only import is `import type {...}` (verbatimModuleSyntax).
   - **`noUncheckedIndexedAccess`**: array/index access (`arr[0]`, `obj[key]`) is treated as possibly `undefined` — verify the code handles that, doesn't silently coerce.
   - **`exactOptionalPropertyTypes`**: nothing is passing literal `undefined` to an optional property — omit the key instead.
   - **No `any`** (Biome errors anyway, but spot-check `as unknown as X` cheats).
   - **No `console.log`** in shipped code (Biome warns — flag any new ones).
   - **Server actions** start with `"use server"` and call `requireSession()` / `requireActiveOrg()` if they touch user data.
   - **Auth boundaries**: any new API route under `apps/web/src/app/api/` checks auth before doing real work.
   - **Drizzle, not raw SQL**, outside `packages/db/migrations/`.
   - **No secrets** in code or test fixtures. `gitleaks` will catch known patterns; spot-check anyway.

4. **Tests for new behavior.** Any new branch, new error code, or new exported function should have at least one Vitest case (or Node test for the CLI). If a behaviour change has no test, flag it.

5. **Dependency hygiene.** New entries in any `package.json` `dependencies` — call them out by name. `@hostfunc/sdk` and `@hostfunc/cli` are published; their deps need a changeset (`pnpm changeset`).

6. **Public API surface.** Changes to `packages/runtime-sdk/src/index.ts`, `packages/runtime-sdk/src/ai.ts`, `packages/runtime-sdk/src/agent.ts`, `packages/runtime-sdk/src/vector.ts`, or `packages/cli/src/bin.ts` need a changeset and a versioning consideration (major/minor/patch).

7. **Report.** Group findings: "Must fix", "Should consider", "Nice to have". Always include the exact file/line.

## Conventions

- Treat Biome warnings (e.g. `noConsoleLog`) as must-fix in shipped code, ignore in tests.
- Treat Biome errors (`noExplicitAny`, `noUnusedImports`, `noUnusedVariables`) as blocking.
- Don't suggest stylistic changes Biome already handles (quote style, indentation, trailing commas) — Biome owns those.
- Match the existing pattern in the file/area before suggesting a different one.

## Gotchas

- **Turbo's `^build` dep** means typecheck/test can fail with a misleading "cannot find module" if a dep wasn't rebuilt. If a typecheck failure mentions a `@hostfunc/*` import, suggest `pnpm build` (or `pnpm --filter @hostfunc/<dep> build`) before re-running.
- **Next.js 16 deprecations** — if the change touches `apps/web` or `apps/docs`, scan for any deprecation warnings the framework emits and call them out. See `apps/web/AGENTS.md`.
- **Runtime tokens** — if a change touches token plumbing in `apps/runtime`, `apps/cron`, or `apps/tail`, all three must keep using the same env-var names and the comparison must remain consistent.

## Done means

- All three CI gates (`lint`, `typecheck`, `test`) are green locally.
- All "Must fix" items are addressed or explicitly accepted by the user.
- New behaviour has tests.
- Any dep/SDK/CLI change has a changeset (or is explicitly flagged for one).
- Reviewer's report is grouped and references files by path.
