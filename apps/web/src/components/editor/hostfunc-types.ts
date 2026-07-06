// Hand-maintained for v0. In a future pass we'll generate this from
// packages/runtime-sdk's built .d.ts at build time.
export const HOSTFUNC_TYPES_DTS = `
declare module "@hostfunc/sdk" {
  export type JsonPrimitive = string | number | boolean | null;
  export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
  export type JsonObject = { [key: string]: JsonValue };

  export interface ExecuteFunctionOptions {
    /** Optional per-call timeout in milliseconds (bounded by runtime limits). */
    timeoutMs?: number;
  }

  export interface FnApi {
    /**
     * Invoke another Hostfunc function by \`orgSlug/fnSlug\`.
     *
     * The runtime preserves call lineage and applies call-depth protection to
     * prevent infinite recursion. Each nested call records \`trigger_kind: fn_call\`
     * in the downstream execution trace.
     *
     * @param slug - Target function identifier in \`orgSlug/fnSlug\` format (required).
     * @param input - JSON-serializable payload forwarded to the downstream function's \`main\` input (optional).
     * @param options - Per-call options (optional). \`timeoutMs\` overrides the default call timeout.
     * @returns Parsed JSON value returned by the downstream function, or \`null\` if it returned nothing.
     * @throws \`FN_CALL_DEPTH\` — call chain depth exceeded or a cycle was detected.
     * @throws \`FN_CALL_TIMEOUT\` — child call exceeded the timeout.
     * @throws \`FN_EXECUTE_FAILED\` — downstream returned non-2xx or a network failure occurred.
     * @example
     * const report = await fn.executeFunction("my-org/generate-report", { customerId: "c_123" });
     * return await fn.executeFunction("my-org/post-to-slack", { report, channel: "#alerts" });
     */
    executeFunction<T = unknown>(
      slug: string,
      input?: JsonValue,
      options?: ExecuteFunctionOptions,
    ): Promise<T>;

    /**
     * Emit a structured log line that appears in execution logs.
     *
     * Logs are stored and retrievable from the execution detail view and via
     * the SSE log stream. Use structured \`fields\` instead of embedding data
     * into the message string for better searchability.
     *
     * @param level - Severity level: \`"debug"\`, \`"info"\`, \`"warn"\`, or \`"error"\`.
     * @param message - Human-readable log message.
     * @param fields - Optional key-value metadata attached to the log entry.
     * @example
     * fn.log("info", "payment.processed", { orderId: order.id, amount: order.total });
     * fn.log("error", "webhook.failed", { url: webhookUrl, status: res.status });
     */
    log(level: "debug" | "info" | "warn" | "error", message: string, fields?: Record<string, JsonValue>): void;
  }

  export interface SecretApi {
    /**
     * Retrieve an optional secret configured in Function Settings → Environment Variables.
     *
     * Returns \`null\` when the key is not set, allowing graceful fallback logic.
     * The value is decrypted at runtime and never persisted in logs.
     *
     * @param key - Secret key name exactly as configured in the dashboard.
     * @returns The decrypted secret string, or \`null\` when the key is not configured.
     * @throws \`INFRA_EXECUTE_FAILED\` — secret service cannot be reached or auth headers are invalid.
     * @example
     * const webhookUrl = await secret.get("OPTIONAL_WEBHOOK_URL");
     * if (!webhookUrl) return { delivered: false, reason: "missing_optional_webhook" };
     */
    get(key: string): Promise<string | null>;

    /**
     * Retrieve a required secret configured in Function Settings → Environment Variables.
     *
     * Use this when the function cannot run without the secret. Throws a structured
     * \`missing_secret\` error (with \`key\` and \`docsUrl\` detail) so callers get an
     * actionable message rather than a \`null\` pointer crash downstream.
     *
     * @param key - Secret key name exactly as configured in the dashboard.
     * @returns The decrypted secret string.
     * @throws \`MISSING_SECRET\` — key is not configured (includes key name and docs link in error detail).
     * @throws \`INFRA_EXECUTE_FAILED\` — secret service cannot be reached.
     * @example
     * const apiKey = await secret.getRequired("OPENAI_API_KEY");
     * const slackToken = await secret.getRequired("SLACK_BOT_TOKEN");
     */
    getRequired(key: string): Promise<string>;
  }

  export interface RuntimeContext {
    execId: string;
    fnId: string;
    orgId: string;
    token: string;
    controlPlane: string;
    runtimeUrl?: string;
    callChain?: string[];
    maxCallDepth?: number;
    debug?: boolean;
    isEnvFallback?: boolean;
  }

  export class SdkError extends Error {
    code: string;
    details?: unknown;
    constructor(code: string, message: string, details?: unknown);
  }

  const fn: FnApi;
  export const secret: SecretApi;
  export default fn;
}

declare module "@hostfunc/sdk/ai" {
  export interface AiMessage {
    role: "system" | "user" | "assistant";
    content: string;
  }

  export interface AiOptions {
    /** Model identifier override (e.g. \`"gpt-4o"\`, \`"claude-3-5-sonnet-latest"\`). Uses workspace default when omitted. */
    model?: string;
    /** Sampling temperature (0–2). Lower values produce more deterministic output. */
    temperature?: number;
    /** Hard cap on output tokens. */
    maxTokens?: number;
    /** System prompt string injected before the conversation. */
    system?: string;
  }

  export interface AiUsage {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  }

  export interface AiResponse {
    /** The generated text content. */
    text: string;
    model?: string;
    provider?: string;
    usage?: AiUsage;
    finishReason?: string;
    raw?: unknown;
  }

  export interface EmbeddingResult {
    /** Numeric embedding vector ready for vector upsert/query. */
    embedding: number[];
    model?: string;
    provider?: string;
    raw?: unknown;
  }

  export type StreamChunk =
    | { type: "delta"; text?: string }
    | { type: "done"; done: true };

  /**
   * Request a non-streamed completion from the configured workspace AI model.
   *
   * Resolves model/provider from: (1) per-function AI integration override,
   * (2) workspace default AI integration. Configure defaults in
   * Dashboard → Settings → Integrations.
   *
   * @param prompt - Either a plain string prompt or an array of \`AiMessage\` objects for multi-turn conversation.
   * @param options - Optional model controls: \`model\`, \`temperature\`, \`maxTokens\`, \`system\`.
   * @returns \`AiResponse\` with \`text\`, \`model\`, \`provider\`, token \`usage\`, and \`finishReason\`.
   * @example
   * import { askAi } from "@hostfunc/sdk/ai";
   *
   * const result = await askAi(
   *   [
   *     { role: "system", content: "You summarize execution logs concisely." },
   *     { role: "user", content: logText },
   *   ],
   *   { model: "gpt-4o", temperature: 0.2, maxTokens: 300 },
   * );
   * return { summary: result.text };
   */
  export function askAi(
    prompt: string | AiMessage[],
    options?: AiOptions,
  ): Promise<AiResponse>;

  /**
   * Async generator for streaming model output chunks.
   *
   * Use \`for await\` to consume delta chunks as they arrive. The stream ends
   * with a \`{ type: "done" }\` sentinel. Useful for long responses where
   * first-token latency matters.
   *
   * @param prompt - Either a plain string prompt or an array of \`AiMessage\` objects.
   * @param options - Optional model controls (same as \`askAi\`).
   * @returns \`AsyncGenerator\` yielding \`{ type: "delta"; text: string }\` then \`{ type: "done" }\`.
   * @example
   * import { streamAi } from "@hostfunc/sdk/ai";
   *
   * let output = "";
   * for await (const chunk of streamAi("Write a haiku about serverless.", { temperature: 0.8 })) {
   *   if (chunk.type === "delta" && chunk.text) output += chunk.text;
   * }
   * return { poem: output };
   */
  export function streamAi(
    prompt: string | AiMessage[],
    options?: AiOptions,
  ): AsyncGenerator<StreamChunk, void, void>;

  /**
   * Generate an embedding vector suitable for vector upsert/query workflows.
   *
   * Embeddings are produced by the workspace-configured embedding model.
   * Generate once and store via \`@hostfunc/sdk/vector\` upsert to avoid
   * re-embedding the same text on every invocation.
   *
   * @param text - The input string to embed.
   * @param options - Optional \`model\` override for the embedding model.
   * @returns \`EmbeddingResult\` with a numeric \`embedding\` array and usage metadata.
   * @example
   * import { createEmbedding } from "@hostfunc/sdk/ai";
   * import { upsert, query } from "@hostfunc/sdk/vector";
   *
   * const { embedding } = await createEmbedding(input.text);
   * const results = await query("docs", embedding, { topK: 5 });
   */
  export function createEmbedding(
    text: string,
    options?: Pick<AiOptions, "model">,
  ): Promise<EmbeddingResult>;
}

declare module "@hostfunc/sdk/agent" {
  export type AgentStatus = "created" | "queued" | "running" | "completed" | "failed";

  export interface AgentStep {
    id?: string;
    type?: string;
    message?: string;
    ts?: string;
    [key: string]: unknown;
  }

  export interface AgentConfig {
    /** Identifier for this agent run (used in logs and step traces). */
    name: string;
    /** Natural-language goal describing what the agent should accomplish. */
    goal: string;
    /** Model override (e.g. \`"gpt-4o"\`). Uses workspace AI default when omitted. */
    model?: string;
    /** Hard cap on agent loop iterations. Keeps unbounded agents from running indefinitely. */
    maxSteps?: number;
    /** Overall execution timeout in milliseconds. */
    timeoutMs?: number;
    /** Whitelist of tool capabilities available to this agent (e.g. \`["functions.execute"]\`). */
    tools?: string[];
  }

  export interface AgentResult {
    id: string;
    status: AgentStatus;
    output?: string;
    startedAt?: string;
    finishedAt?: string;
    steps?: AgentStep[];
    [key: string]: unknown;
  }

  /**
   * Provision a queued agent run without blocking for completion.
   *
   * The agent is scheduled and returns immediately with an \`id\` and
   * \`"queued"\` status. Use when you want fire-and-forget agent execution
   * and will poll or react to completion via a webhook or trigger.
   *
   * @param config - Agent configuration: \`name\`, \`goal\`, and optional \`model\`, \`maxSteps\`, \`timeoutMs\`, \`tools\`.
   * @returns \`AgentResult\` with \`id\`, initial \`status\`, timestamps, and step history.
   * @example
   * import { createAgent } from "@hostfunc/sdk/agent";
   *
   * const run = await createAgent({
   *   name: "report-builder",
   *   goal: "Generate a weekly summary from executions and post to Slack.",
   *   maxSteps: 10,
   *   tools: ["functions.execute", "executions.list"],
   * });
   * return { agentId: run.id, status: run.status };
   */
  export function createAgent(config: AgentConfig): Promise<AgentResult>;

  /**
   * Start agent execution immediately and return the current run state.
   *
   * Blocks until the agent completes or times out. Use for short deterministic
   * agent tasks where you need the result inline. Set \`maxSteps\` and
   * \`timeoutMs\` to bound execution cost.
   *
   * @param config - Agent configuration: \`name\`, \`goal\`, and optional \`model\`, \`maxSteps\`, \`timeoutMs\`, \`tools\`.
   * @returns \`AgentResult\` with final \`status\`, \`output\`, and collected \`steps\`.
   * @example
   * import { runAgent } from "@hostfunc/sdk/agent";
   *
   * const result = await runAgent({
   *   name: "incident-triage",
   *   goal: "Classify this incident and identify the owning team.",
   *   maxSteps: 6,
   *   tools: ["functions.execute"],
   * });
   * return { output: result.output, steps: result.steps?.length };
   */
  export function runAgent(config: AgentConfig): Promise<AgentResult>;
}

declare module "@hostfunc/sdk/vector" {
  export interface VectorMetadata {
    [key: string]: string | number | boolean | null | undefined;
  }

  export interface VectorRecord {
    /** Stable unique identifier for this vector (used for upsert idempotency and deletion). */
    id: string;
    /** Numeric embedding array (must match the dimension of the configured vector backend). */
    values: number[];
    /** Optional key-value metadata stored alongside the vector for filtering and display. */
    metadata?: VectorMetadata;
  }

  export interface VectorMatch {
    id: string;
    score: number;
    metadata?: VectorMetadata;
    values?: number[];
  }

  export interface QueryResult {
    namespace: string;
    matches: VectorMatch[];
  }

  export interface UpsertResult {
    namespace: string;
    upserted: number;
  }

  export interface DeleteResult {
    namespace: string;
    deleted: number;
  }

  /**
   * Insert or update vectors and metadata in a namespace.
   *
   * Uses upsert semantics: vectors with existing \`id\`s are overwritten,
   * new \`id\`s are inserted. Use stable IDs tied to your domain records
   * (e.g. customer IDs, document slugs) for idempotent re-indexing.
   *
   * @param namespace - Logical grouping (e.g. \`"profiles"\`, \`"docs"\`, \`"incidents"\`).
   * @param vectors - Array of \`{ id, values, metadata? }\` records to upsert.
   * @returns \`UpsertResult\` with \`namespace\` and \`upserted\` count.
   * @example
   * import { upsert } from "@hostfunc/sdk/vector";
   *
   * await upsert("docs", [
   *   { id: "doc_abc", values: embedding, metadata: { title: "Setup guide", category: "onboarding" } },
   * ]);
   */
  export function upsert(namespace: string, vectors: VectorRecord[]): Promise<UpsertResult>;

  /**
   * Execute similarity search against a namespace.
   *
   * Returns the top-K most similar vectors ranked by cosine similarity score.
   * Pair with \`createEmbedding\` from \`@hostfunc/sdk/ai\` to convert query text
   * into an embedding before searching.
   *
   * @param namespace - The namespace to search.
   * @param embedding - Query embedding vector (numeric array).
   * @param options - Optional \`topK\` (default 10) and \`includeValues\` flag.
   * @returns \`QueryResult\` with \`namespace\` and ranked \`matches\` array.
   * @example
   * import { createEmbedding } from "@hostfunc/sdk/ai";
   * import { query } from "@hostfunc/sdk/vector";
   *
   * const { embedding } = await createEmbedding(input.query);
   * const { matches } = await query("docs", embedding, { topK: 5 });
   * return matches.map((m) => ({ id: m.id, score: m.score, ...m.metadata }));
   */
  export function query(
    namespace: string,
    embedding: number[],
    options?: { topK?: number; includeValues?: boolean },
  ): Promise<QueryResult>;

  /**
   * Delete vectors by ID from a namespace.
   *
   * IDs that do not exist are silently ignored. Use to keep the namespace
   * in sync when source records are deleted.
   *
   * @param namespace - The namespace to delete from.
   * @param ids - Array of vector IDs to remove.
   * @returns \`DeleteResult\` with \`namespace\` and \`deleted\` count.
   * @example
   * import { deleteVectors } from "@hostfunc/sdk/vector";
   *
   * await deleteVectors("profiles", ["cus_old_1", "cus_old_2"]);
   */
  export function deleteVectors(namespace: string, ids: string[]): Promise<DeleteResult>;

  /**
   * Create a scoped helper object with upsert, query, and deleteVectors bound to one namespace.
   *
   * Useful when all vector operations in a function target the same namespace —
   * avoids repeating the namespace string on every call.
   *
   * @param namespace - The namespace to scope all operations to.
   * @returns Object with \`upsert(vectors)\`, \`query(embedding, options)\`, and \`deleteVectors(ids)\` methods.
   * @example
   * import { getNamespace } from "@hostfunc/sdk/vector";
   *
   * const ns = getNamespace("profiles");
   * await ns.upsert([{ id: "cus_1", values: embedding }]);
   * const results = await ns.query(queryEmbedding, { topK: 3 });
   * await ns.deleteVectors(["cus_old"]);
   */
  export function getNamespace(namespace: string): {
    upsert: (vectors: VectorRecord[]) => Promise<UpsertResult>;
    query: (embedding: number[], options?: { topK?: number; includeValues?: boolean }) => Promise<QueryResult>;
    deleteVectors: (ids: string[]) => Promise<DeleteResult>;
  };
}

declare module "@hostfunc/sdk/kv" {
  export interface KvSetOptions {
    /** Seconds until the key expires. Omit for no TTL. */
    ttlSeconds?: number;
  }

  export interface KvListOptions {
    /** Only return keys starting with this prefix. */
    prefix?: string;
    /** Max keys per page (1–1000, default 100). */
    limit?: number;
    /** Cursor from a previous page. */
    cursor?: string;
  }

  export interface KvListResult {
    keys: string[];
    /** Pass back via \`options.cursor\` to fetch the next page. Null when done. */
    cursor: string | null;
  }

  /**
   * Built-in key-value storage scoped to this function. Values are JSON.
   *
   * No setup required — every function gets its own persistent store.
   * Use it for counters, form submissions, small app state, and caching.
   * \`kv.incr\` is atomic; a \`get\` followed by \`set\` is not, so never use
   * read-modify-write for counters.
   *
   * @example
   * import { kv } from "@hostfunc/sdk/kv";
   *
   * export async function main(input: { option: string }) {
   *   const votes = await kv.incr("vote:" + input.option);
   *   return { option: input.option, votes };
   * }
   */
  export const kv: {
    /** Read a value, or null when the key is missing or expired. */
    get<T = unknown>(key: string): Promise<T | null>;
    /** Write a JSON value, optionally expiring after \`ttlSeconds\`. */
    set(key: string, value: unknown, options?: KvSetOptions): Promise<void>;
    /** Remove a key. Resolves true when a key was actually deleted. */
    delete(key: string): Promise<boolean>;
    /** Atomically add \`delta\` (default 1) to a numeric value, creating it at 0 first. */
    incr(key: string, delta?: number): Promise<number>;
    /** Fetch up to 100 keys in one round-trip. Missing keys map to null. */
    getMany<T = unknown>(keys: string[]): Promise<Record<string, T | null>>;
    /** Page through keys, optionally filtered by prefix. */
    list(options?: KvListOptions): Promise<KvListResult>;
  };
}
`;

/** Structured quick-reference shown in the SDK doc panel when hovering an import specifier. */
export interface SdkHoverDoc {
  title: string;
  summary: string;
  canonicalImport: string;
  api: ReadonlyArray<{ symbol: string; sig: string }>;
  example: string;
  tip?: string;
}

export const HOSTFUNC_HOVER_DOCS: Record<string, SdkHoverDoc> = {
  "@hostfunc/sdk": {
    title: "@hostfunc/sdk — Hostfunc core",
    summary:
      "The default runtime import. Provides function composition, secret access, and structured logging.",
    canonicalImport: 'import fn, { secret } from "@hostfunc/sdk";',
    api: [
      { symbol: "fn.executeFunction", sig: "(slug, input?, options?) → Promise<T>" },
      { symbol: "fn.log", sig: '("debug"|"info"|"warn"|"error", msg, fields?) → void' },
      { symbol: "secret.get", sig: "(key) → Promise<string | null>" },
      { symbol: "secret.getRequired", sig: "(key) → Promise<string>" },
    ],
    example: `import fn, { secret } from "@hostfunc/sdk";

export async function main(input: { customerId: string }) {
  const apiKey = await secret.getRequired("STRIPE_KEY");
  return await fn.executeFunction("org/charge", {
    customerId: input.customerId,
    apiKey,
  });
}`,
    tip: "Configure secrets in Function Settings → Environment Variables.",
  },

  "@hostfunc/sdk/ai": {
    title: "@hostfunc/sdk/ai — AI helpers",
    summary:
      "Text generation and embeddings from the workspace AI provider. Configure provider in Dashboard → Settings → Integrations.",
    canonicalImport: 'import { askAi } from "@hostfunc/sdk/ai";',
    api: [
      { symbol: "askAi", sig: "(prompt, options?) → Promise<AiResponse>" },
      { symbol: "streamAi", sig: "(prompt, options?) → AsyncGenerator<StreamChunk>" },
      { symbol: "createEmbedding", sig: "(text, options?) → Promise<EmbeddingResult>" },
    ],
    example: `import { askAi } from "@hostfunc/sdk/ai";

const result = await askAi(
  [
    { role: "system", content: "You are a concise summarizer." },
    { role: "user", content: input.text },
  ],
  { model: "gpt-4o", temperature: 0.2, maxTokens: 300 },
);
return { summary: result.text, tokens: result.usage?.totalTokens };`,
    tip: "Set low temperature (0–0.3) for deterministic operational outputs.",
  },

  "@hostfunc/sdk/agent": {
    title: "@hostfunc/sdk/agent — Agent orchestration",
    summary:
      "Create and run autonomous jobs with step traces and status tracking. Uses the same AI provider resolution as askAi.",
    canonicalImport: 'import { runAgent } from "@hostfunc/sdk/agent";',
    api: [
      { symbol: "createAgent", sig: "(config: AgentConfig) → Promise<AgentResult>  [queued]" },
      { symbol: "runAgent", sig: "(config: AgentConfig) → Promise<AgentResult>  [inline]" },
    ],
    example: `import { runAgent } from "@hostfunc/sdk/agent";

const result = await runAgent({
  name: "incident-triage",
  goal: "Classify this incident and identify the owning team.",
  maxSteps: 6,
  tools: ["functions.execute"],
});
return { output: result.output, steps: result.steps?.length };`,
    tip: "Always set maxSteps and timeoutMs to bound cost and execution time.",
  },

  "@hostfunc/sdk/vector": {
    title: "@hostfunc/sdk/vector — Vector CRUD and search",
    summary:
      "Insert, query, and delete vectors in named namespaces. Pair with createEmbedding from @hostfunc/sdk/ai for semantic search.",
    canonicalImport: 'import { upsert, query } from "@hostfunc/sdk/vector";',
    api: [
      { symbol: "upsert", sig: "(namespace, vectors[]) → Promise<UpsertResult>" },
      { symbol: "query", sig: "(namespace, embedding, options?) → Promise<QueryResult>" },
      { symbol: "deleteVectors", sig: "(namespace, ids[]) → Promise<DeleteResult>" },
      { symbol: "getNamespace", sig: "(namespace) → { upsert, query, deleteVectors }" },
    ],
    example: `import { createEmbedding } from "@hostfunc/sdk/ai";
import { upsert, query } from "@hostfunc/sdk/vector";

const { embedding } = await createEmbedding(input.text);
await upsert("docs", [{ id: input.docId, values: embedding }]);
const { matches } = await query("docs", embedding, { topK: 5 });
return matches.map((m) => ({ id: m.id, score: m.score }));`,
    tip: "Configure Pinecone or Upstash credentials in Dashboard → Settings → Integrations.",
  },

  "@hostfunc/sdk/kv": {
    title: "@hostfunc/sdk/kv — Built-in key-value storage",
    summary:
      "Persistent JSON storage scoped to this function, with no setup. Use it for counters, form submissions, small app state, and caching.",
    canonicalImport: 'import { kv } from "@hostfunc/sdk/kv";',
    api: [
      { symbol: "kv.get", sig: "(key) → Promise<T | null>" },
      { symbol: "kv.set", sig: "(key, value, { ttlSeconds? }?) → Promise<void>" },
      { symbol: "kv.delete", sig: "(key) → Promise<boolean>" },
      { symbol: "kv.incr", sig: "(key, delta = 1) → Promise<number>  [atomic]" },
      { symbol: "kv.getMany", sig: "(keys[]) → Promise<Record<string, T | null>>" },
      { symbol: "kv.list", sig: "({ prefix?, limit?, cursor? }?) → Promise<KvListResult>" },
    ],
    example: `import { kv } from "@hostfunc/sdk/kv";

export async function main(input: { option: string }) {
  const votes = await kv.incr("vote:" + input.option);
  return { option: input.option, votes };
}`,
    tip: "kv.incr is atomic — use it for counters instead of get + set.",
  },
};
