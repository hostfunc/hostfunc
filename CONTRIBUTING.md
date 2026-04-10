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

## Security

Found a vulnerability? See [SECURITY.md](./SECURITY.md). **Do not open a public issue.**