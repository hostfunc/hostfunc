# @hostfunc/api-client

Shared, dependency-free typed client for the hostfunc control-plane `/api/cli/*` surface.

This package is the single source of truth for the request/response contract between the platform
and its programmatic clients. It is consumed by:

- **`@hostfunc/cli`** — the public `hostfunc` binary.
- **the VS Code extension** (`apps/vscode-extension`).

It is `private` and never published; it only ships transpiled types/JS to its workspace consumers.

```ts
import { HostfuncApiClient } from "@hostfunc/api-client";

const client = new HostfuncApiClient({
  baseUrl: "https://hostfunc.dev",
  getToken: () => process.env.HOSTFUNC_TOKEN, // sync or async; `hfn_live_…` PAT
});

const { items } = await client.listFunctions();
```

When a route handler under `apps/web/src/app/api/cli/**` changes shape, update `src/types.ts` here.
