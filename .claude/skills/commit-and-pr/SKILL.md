---
name: commit-and-pr
description: This skill should be used whenever the user asks to commit, open a PR, push, or wrap up work in the hostfunc monorepo. It handles Conventional Commits with scopes, branch naming, the husky pre-commit gauntlet, changesets for published packages, and the PR body template. Trigger this whenever the user mentions commit, push, PR, "open a pull request", "wrap up", or "ship it".
---

# commit-and-pr

## When to use

- User asks to commit pending changes.
- User asks to push a branch or open a PR.
- User says "wrap up" or "ship this".
- User asks about commit message format or branch naming for this repo.

## Steps

1. **Stage deliberately.** `git status` first. Add specific files by name. Never `git add -A` or `git add .` — `gitleaks` will catch secrets but the safer move is not to stage them.

2. **Write a Conventional Commit with a scope.**
   - Format: `<type>(<scope>): <description>`
   - Types in this repo: `feat`, `fix`, `chore`, `ci`, `docs`, `refactor`, `test`. `commitlint` enforces this in the `commit-msg` hook.
   - Scopes from history: `web`, `runtime`, `docs`, `cron`, `email`, `tail`, `outbound`, `db`, `sdk`, `cli`, `ci`, `release`, `changeset`. Use the most specific one; omit scope only for truly cross-cutting changes.
   - Examples from history:
     - `feat(web): ship marketplace, editor, and settings UX upgrades`
     - `fix(runtime): default public HTTP runs to no-auth`
     - `fix(ci): restore main check reliability and web build path`

3. **Expect the pre-commit hook to take a while.** It runs `gitleaks protect --staged` then `pnpm test`. That's the whole monorepo's test suite. Don't bypass with `--no-verify`. If it fails:
   - `gitleaks` failure: a real or suspected secret is staged. Move it to an env var or add an allowlist rule to `.gitleaks.toml` if it's a false positive.
   - test failure: fix the test (use the `debug-failing-test` skill). Then re-stage and create a **new** commit — never `--amend` after a hook failure, because the previous commit didn't happen and you'd modify the wrong one.

4. **For changes to published packages, add a changeset.** Published packages are `@hostfunc/sdk` and `@hostfunc/cli`. If you touched either:
   ```
   pnpm changeset
   ```
   Pick a bump (`patch` for fixes, `minor` for new features, `major` for breaking changes), write a short summary, and commit the generated `.changeset/*.md` file together with the change.

5. **Branch naming**: `<type>/<kebab-description>` matching the commit type. Examples from history:
   - `feat/marketplace-deploy-hardening`
   - `fix/sdk-index-exports`
   - `hotfix/main-check-failures`
   - `chore/changeset-ignore-apps`
   - `docs/changesets-option-a-pat`

6. **Push and open the PR.** Use `gh pr create` with a HEREDOC body. Template:

```bash
gh pr create --title "<type>(<scope>): <description>" --body "$(cat <<'EOF'
## Summary
- <bullet>
- <bullet>

## Test plan
- [ ] `pnpm lint` clean
- [ ] `pnpm typecheck` clean
- [ ] `pnpm test` green
- [ ] <feature-specific manual check>

## Notes
<release impact, deploy considerations, changeset note, anything reviewer needs to know>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

7. **Watch CI.** `gh run watch` or `gh pr checks`. The jobs that run on every PR (from `.github/workflows/ci.yml`):
   - `lint` — `biome check --changed --since=origin/main --no-errors-on-unmatched .`
   - `typecheck` — `pnpm typecheck`
   - `test` — `pnpm test`
   - `web-build` — builds web's deps then runs `next build`
   - `cli-pack-smoke` — packs the CLI tarball and runs `hostfunc help`

   Plus `secret-scan` (gitleaks against the full diff).

## Conventions

- Never use `git commit --no-verify`. The `gitleaks` + `pnpm test` pre-commit is non-negotiable.
- Never use `git commit --amend` after a hook failure — make a new commit. The failed commit didn't happen.
- Always create new commits, not amends, unless the user explicitly asks for an amend on an unpushed commit.
- Never `git push --force` to `main` or `master`. Force-pushing a feature branch is allowed but always confirm with the user first.
- Co-author lines are optional in this repo — the recent history is mixed. Keep them only if the user asks.

## Gotchas

- **The `pnpm test` step in pre-commit is slow.** That's expected — the trade-off is that a clean pre-commit ≈ a green CI test job.
- **Changesets release flow**: tags like `v*` push trigger production Worker deploys, not just an npm publish. Don't tag manually; let the `changesets/action` PR + merge handle it.
- **Web build step in CI** needs Stripe placeholder env vars during prerender. If a CI failure looks like a Stripe-related env error, that's it — see the `fix(ci)` history.
- The `prepare` script runs `husky` only if it's installed; new clones get the hooks via `pnpm install`.

## Done means

- The commit message is a valid Conventional Commit with an appropriate scope.
- `gitleaks` + `pnpm test` pre-commit hooks ran and passed.
- If a published package changed, a changeset is included.
- If a PR was opened, the URL is reported back to the user.
- CI is green or the user has been told exactly which job is failing.
