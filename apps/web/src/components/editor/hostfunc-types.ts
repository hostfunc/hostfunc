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
`;
