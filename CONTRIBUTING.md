# Contributing to hostfunc

Thanks for your interest. A few ground rules:

## Setup

1. Install Node 22 and pnpm 9.
2. `pnpm install`
3. `pnpm test` should pass before you start.

## Development workflow

1. Create a branch: `git checkout -b feat/my-thing`
2. Make your changes.
3. Add a changeset: `pnpm changeset` (only if your change touches a published package).
4. Commit using Conventional Commits: `feat(executor-core): add new method`.
5. Open a PR against `main`.

## Pull request checklist

- [ ] Tests added / updated
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] Changeset added (if applicable)
- [ ] Docs updated (if applicable)

## Code of Conduct

See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

## Secrets

**Never commit a real secret.** This repo is public and powers a hosted service; any leaked credential will be rotated and your PR rejected.

- Use placeholders like `replace-with-...` or `<your-value>` in every `.env.example` file.
- Keep real values in your password manager and locally in gitignored files (`.env.local`, `.env.staging.workers`, `.env.production.workers`).
- A [`gitleaks`](https://github.com/gitleaks/gitleaks) pre-commit hook scans staged changes before they leave your machine. Install it once with `brew install gitleaks` (the hook skips with a warning if missing, but CI will block your PR).
- The [`secret-scan`](.github/workflows/secret-scan.yml) workflow runs the same scan on every PR and is a required check.
- The allowlist for known dev defaults lives in [`.gitleaks.toml`](.gitleaks.toml) — add entries there for documented placeholders only, never for real credentials.

## Security

Found a vulnerability? See [SECURITY.md](./SECURITY.md). **Do not open a public issue.**