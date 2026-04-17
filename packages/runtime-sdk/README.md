# @hostfunc/sdk

Production SDK for hostfunc functions.

## Authentication

When using `@hostfunc/sdk` from npm outside the hosted editor/runtime, set:

- `HOSTFUNC_API_KEY` - API token created in Dashboard -> Settings -> Tokens
- `HOSTFUNC_CONTROL_PLANE_URL` - your hostfunc web app URL
- `HOSTFUNC_RUNTIME_URL` - your hostfunc runtime URL (optional if same as control plane)
- `HOSTFUNC_FN_ID` - function id when using `secret.get(...)` outside hosted runtime

Monaco/editor-based function workflows auto-provision and inject a workspace SDK key for you.

## Modules

- `@hostfunc/sdk` - core function APIs (`executeFunction`, `secret`)
- `@hostfunc/sdk/ai` - AI helpers (`askAi`, `streamAi`, `createEmbedding`)
- `@hostfunc/sdk/agent` - agent orchestration (`createAgent`, `runAgent`)
- `@hostfunc/sdk/vector` - vector operations (`upsert`, `query`, `deleteVectors`, `getNamespace`)

## Core Usage

```ts
import fn, { secret } from "@hostfunc/sdk";

export async function main(input: { customerId: string }) {
  const apiKey = await secret.getRequired("CLAUDE_API_KEY");
  const report = await fn.executeFunction("org/generate-report", {
    customerId: input.customerId,
    apiKey,
  });
  return report;
}
```

## AI Usage

```ts
import { askAi } from "@hostfunc/sdk/ai";

const summary = await askAi("Summarize this execution log.");
```

## Agent Usage

```ts
import { runAgent } from "@hostfunc/sdk/agent";

const run = await runAgent({
  name: "triage-alerts",
  goal: "Classify incident events and call escalation functions.",
});
```

## Vector Usage

```ts
import { createEmbedding } from "@hostfunc/sdk/ai";
import { upsert, query } from "@hostfunc/sdk/vector";

const { embedding } = await createEmbedding("customer profile text");
await upsert("profiles", [{ id: "cus_123", values: embedding }]);
const hits = await query("profiles", embedding, { topK: 5 });
```
