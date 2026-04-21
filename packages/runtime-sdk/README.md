<div align="center">
  <h1>💻 @hostfunc/sdk</h1>
  <p><b>The production-ready Runtime SDK for Hostfunc.</b></p>
  <p>Build, connect, and orchestrate serverless TypeScript functions, AI agents, and Vector databases with a beautiful, type-safe API.</p>

  [![Version](https://img.shields.io/npm/v/@hostfunc/sdk?color=blue&style=flat-square)](https://www.npmjs.com/package/@hostfunc/sdk)
  [![License](https://img.shields.io/npm/l/@hostfunc/sdk?color=green&style=flat-square)](../../LICENSE)
</div>

<hr />

## 🔐 Authentication

When executing `@hostfunc/sdk` locally or from an external npm environment (outside the natively hosted runtime), you must provide authentication details via environment variables:

- `HOSTFUNC_API_KEY` — Your API token (create this in **Dashboard -> Settings -> Tokens**)
- `HOSTFUNC_CONTROL_PLANE_URL` — The URL of your Hostfunc web dashboard (e.g., `http://localhost:3000`)
- `HOSTFUNC_RUNTIME_URL` — (Optional) Your Hostfunc runtime execution URL (defaults to the control plane URL if omitted)
- `HOSTFUNC_FN_ID` — The current Function ID. Required when calling `secret.get(...)` externally.

> **✨ Magic Out of the Box:** If you are using the Monaco editor within the Hostfunc dashboard, you don't need to configure these! The workspace SDK key is auto-provisioned and injected securely for you.

## 📦 Modules

The SDK is broken down into purpose-built modules to keep your imported bundles tiny:

- **`@hostfunc/sdk`** — Core function execution APIs (e.g., `executeFunction`, `secret`)
- **`@hostfunc/sdk/ai`** — Native AI chat and LLM generation (`askAi`, `streamAi`, `createEmbedding`)
- **`@hostfunc/sdk/agent`** — Agentic workflows and orchestration (`createAgent`, `runAgent`)
- **`@hostfunc/sdk/vector`** — Vector DB operations (`upsert`, `query`, `deleteVectors`, `getNamespace`)

---

## 🚀 Core Usage

Call other functions seamlessly and retrieve encrypted secrets dynamically natively from inside your function:

```typescript
import fn, { secret } from "@hostfunc/sdk";

export async function main(input: { customerId: string }) {
  // 1. Fetch a securely injected secret
  const apiKey = await secret.getRequired("CLAUDE_API_KEY");
  
  // 2. Compose workflows by calling another hostfunc!
  const report = await fn.executeFunction("org/generate-report", {
    customerId: input.customerId,
    apiKey,
  });
  
  return { ok: true, report };
}
```

## 🧠 AI Usage

Generate LLM responses with simple, direct primitives:

```typescript
import { askAi } from "@hostfunc/sdk/ai";

export async function main(logData: string) {
  const summary = await askAi(`Summarize this execution log: ${logData}`);
  return { summary };
}
```

## 🤖 Agent Usage

Leverage autonomous agents to fulfill goals and execute tools on your behalf:

```typescript
import { runAgent } from "@hostfunc/sdk/agent";

export async function main(incident: any) {
  const run = await runAgent({
    name: "triage-alerts",
    goal: "Classify incident events and call escalation functions appropriately.",
  });
  return run.result;
}
```

## 📐 Vector Usage

Manage embeddings directly for RAG workflows:

```typescript
import { createEmbedding } from "@hostfunc/sdk/ai";
import { upsert, query } from "@hostfunc/sdk/vector";

export async function main(profileText: string) {
  // 1. Generate text embeddings via AI
  const { embedding } = await createEmbedding(profileText);
  
  // 2. Upsert into your Vector namespace
  await upsert("profiles", [{ id: "cus_123", values: embedding }]);
  
  // 3. Query closest matches using cosine similarity
  const hits = await query("profiles", embedding, { topK: 5 });
  
  return hits;
}
```
