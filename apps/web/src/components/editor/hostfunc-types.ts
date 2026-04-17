// Hand-maintained for v0. In Component 3 we'll generate this from
// packages/runtime-sdk's built .d.ts at build time.
export const HOSTFUNC_TYPES_DTS = `
declare module "@hostfunc/fn" {
  export type JsonPrimitive = string | number | boolean | null;
  export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

  export interface ExecuteFunctionOptions {
    timeoutMs?: number;
  }

  export interface HostFuncApi {
    /**
     * Call another function by its slug.
     * @example const weather = await fn.executeFunction("my-function");
     */
    executeFunction<T = unknown>(
      slug: string,
      input?: JsonValue,
      options?: ExecuteFunctionOptions,
    ): Promise<T>;

    /**
     * Emit structured log lines that appear in execution logs.
     */
    log(level: "debug" | "info" | "warn" | "error", message: string, fields?: Record<string, JsonValue>): void;
  }

  export interface SecretApi {
    /** Get a secret value, or null if missing. */
    get(key: string): Promise<string | null>;
    /** Get a secret value, or throw if missing. */
    getRequired(key: string): Promise<string>;
  }

  const fn: HostFuncApi;
  export const secret: SecretApi;
  export default fn;
}

declare module "@hostfunc/sdk" {
  export { default } from "@hostfunc/fn";
  export * from "@hostfunc/fn";
}

declare module "@hostfunc/sdk/ai" {
  export interface AiMessage {
    role: "system" | "user" | "assistant";
    content: string;
  }

  export interface AiOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }

  export interface AiResponse {
    text: string;
    model?: string;
    provider?: string;
    raw?: unknown;
  }

  export interface EmbeddingResult {
    embedding: number[];
    model?: string;
    provider?: string;
    raw?: unknown;
  }

  export type StreamChunk =
    | { type: "delta"; text?: string }
    | { type: "done"; done: true };

  export function askAi(
    prompt: string | AiMessage[],
    options?: AiOptions,
  ): Promise<AiResponse>;
  export function streamAi(
    prompt: string | AiMessage[],
    options?: AiOptions,
  ): AsyncGenerator<StreamChunk, void, void>;
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
    name: string;
    goal: string;
    model?: string;
    maxSteps?: number;
    timeoutMs?: number;
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

  export function createAgent(config: AgentConfig): Promise<AgentResult>;
  export function runAgent(config: AgentConfig): Promise<AgentResult>;
}

declare module "@hostfunc/sdk/vector" {
  export interface VectorMetadata {
    [key: string]: string | number | boolean | null | undefined;
  }

  export interface VectorRecord {
    id: string;
    values: number[];
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

  export function upsert(namespace: string, vectors: VectorRecord[]): Promise<UpsertResult>;
  export function query(
    namespace: string,
    embedding: number[],
    options?: { topK?: number; includeValues?: boolean },
  ): Promise<QueryResult>;
  export function deleteVectors(namespace: string, ids: string[]): Promise<DeleteResult>;
  export function getNamespace(namespace: string): {
    upsert: (vectors: VectorRecord[]) => Promise<UpsertResult>;
    query: (embedding: number[], options?: { topK?: number; includeValues?: boolean }) => Promise<QueryResult>;
    deleteVectors: (ids: string[]) => Promise<DeleteResult>;
  };
}
`;
