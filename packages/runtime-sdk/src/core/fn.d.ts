import { type ExecuteFunctionOptions, type JsonObject, type JsonValue } from "./types";
export interface FnApi {
    executeFunction<T = JsonValue>(slug: string, input?: JsonObject, options?: ExecuteFunctionOptions): Promise<T>;
    log(level: "debug" | "info" | "warn" | "error", message: string, fields?: JsonObject): void;
}
export declare const fn: FnApi;
//# sourceMappingURL=fn.d.ts.map