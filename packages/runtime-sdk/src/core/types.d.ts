export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | {
    [key: string]: JsonValue;
};
export type JsonObject = Record<string, JsonValue>;
export declare class SdkError extends Error {
    readonly code: string;
    readonly detail: Record<string, unknown> | undefined;
    constructor(code: string, message: string, detail?: Record<string, unknown>);
}
export interface ExecuteFunctionOptions {
    timeoutMs?: number;
}
export interface RuntimeContext {
    execId: string;
    fnId: string;
    orgId: string;
    token: string;
    controlPlane: string;
    runtimeUrl: string;
    callChain: Array<{
        fnId: string;
        execId: string;
    }>;
    maxCallDepth: number;
    debug: boolean;
    isEnvFallback: boolean;
}
//# sourceMappingURL=types.d.ts.map