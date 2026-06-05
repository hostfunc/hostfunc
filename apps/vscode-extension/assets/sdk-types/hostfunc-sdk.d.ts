// Ambient type declarations for @hostfunc/sdk, written into local function projects by the hostfunc
// VS Code extension so `index.ts` gets IntelliSense without an `npm install`. Hand-maintained for
// the core surface; mirrors packages/runtime-sdk. Generating this from the SDK's built .d.ts is a
// follow-up.

declare module "@hostfunc/sdk" {
  export type JsonPrimitive = string | number | boolean | null;
  export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
  export type JsonObject = { [key: string]: JsonValue };

  export interface ExecuteFunctionOptions {
    /** Optional per-call timeout in milliseconds (bounded by runtime limits). */
    timeoutMs?: number;
  }

  export interface FnApi {
    /** Invoke another hostfunc function by `orgSlug/fnSlug`, preserving call lineage. */
    executeFunction<T = unknown>(
      slug: string,
      input?: JsonValue,
      options?: ExecuteFunctionOptions,
    ): Promise<T>;
    /** Emit a structured log line visible in execution logs. */
    log(level: "debug" | "info" | "warn" | "error", message: string, fields?: JsonObject): void;
    /** Read-only access to static assets bundled with the function. */
    readonly assets: AssetsApi;
  }

  export interface SecretApi {
    /** Returns the decrypted secret value, or `null` if unset. */
    get(key: string): Promise<string | null>;
    /** Returns the decrypted secret value, throwing if it is unset. */
    getRequired(key: string): Promise<string>;
  }

  export interface AssetsApi {
    bytes(path: string): Promise<Uint8Array | null>;
    text(path: string): Promise<string | null>;
    url(path: string): string | null;
  }

  export class SdkError extends Error {
    readonly code: string;
  }

  export interface RuntimeContext {
    readonly executionId: string;
    readonly fnId: string;
    readonly orgId: string;
  }

  const fn: FnApi;
  export default fn;
  export const secret: SecretApi;
  export const assets: AssetsApi;
}

declare module "@hostfunc/sdk/ai" {
  import type { JsonObject } from "@hostfunc/sdk";

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
    raw?: JsonObject;
  }
  export function askAi(prompt: string | AiMessage[], options?: AiOptions): Promise<AiResponse>;
  export function streamAi(
    prompt: string | AiMessage[],
    options?: AiOptions,
  ): AsyncGenerator<string>;
  export function createEmbedding(
    text: string,
    options?: { model?: string },
  ): Promise<{ embedding: number[] }>;
}

declare module "@hostfunc/sdk/agent" {
  import type { JsonValue } from "@hostfunc/sdk";

  export interface AgentConfig {
    instructions: string;
    input?: JsonValue;
    tools?: string[];
  }
  export interface AgentResult {
    output: JsonValue;
  }
  export function runAgent(config: AgentConfig): Promise<AgentResult>;
}

declare module "@hostfunc/sdk/vector" {
  export interface VectorMatch {
    id: string;
    score: number;
    metadata?: Record<string, unknown>;
  }
  export interface VectorNamespace {
    upsert(
      items: Array<{ id: string; values: number[]; metadata?: Record<string, unknown> }>,
    ): Promise<void>;
    query(values: number[], options?: { topK?: number }): Promise<VectorMatch[]>;
    deleteVectors(ids: string[]): Promise<void>;
  }
  export function getNamespace(namespace: string): VectorNamespace;
}
