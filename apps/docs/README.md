# apps/docs

Standalone documentation site (Next.js). **Currently a scaffold** — the live user docs are
authored in [`apps/web/src/lib/docs-content.ts`](../web/src/lib/docs-content.ts) and rendered by
the web app at [hostfunc.io/docs](https://hostfunc.io/docs).

If you're updating documentation, edit `docs-content.ts` (typed content; the web app's typecheck
validates the shape). Porting that content into this site is tracked in [ROADMAP.md](../../ROADMAP.md).
