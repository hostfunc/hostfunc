import { getContext } from "./context";
import { type ExecuteFunctionOptions, SdkError, type JsonObject, type JsonValue } from "./types";

const DEFAULT_EXECUTE_TIMEOUT_MS = 30_000;

export interface FnApi {
  executeFunction<T = JsonValue>(
    slug: string,
    input?: JsonObject,
    options?: ExecuteFunctionOptions,
  ): Promise<T>;
  log(level: "debug" | "info" | "warn" | "error", message: string, fields?: JsonObject): void;
}

async function resolveSlug(
  controlPlane: string,
  token: string,
  slug: string,
): Promise<string | null> {
  if (!controlPlane || !token) return null;
  try {
    const res = await fetch(
      `${controlPlane}/api/internal/resolve?slug=${encodeURIComponent(slug)}`,
      { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { fnId?: string };
    return json.fnId ?? null;
  } catch {
    return null;
  }
}

export const fn: FnApi = {
  async executeFunction<T = JsonValue>(
    slug: string,
    input?: JsonObject,
    options?: ExecuteFunctionOptions,
  ): Promise<T> {
    const ctx = getContext();
    const nextChain = [...ctx.callChain, { fnId: ctx.fnId, execId: ctx.execId }];
    if (nextChain.length > ctx.maxCallDepth) {
      throw new SdkError("FN_CALL_DEPTH", `max call depth ${ctx.maxCallDepth} exceeded`, {
        maxDepth: ctx.maxCallDepth,
        chain: nextChain,
      });
    }

    const slash = slug.indexOf("/");
    if (slash < 1) {
      throw new SdkError("FN_EXECUTE_FAILED", "executeFunction slug must be 'orgSlug/fnSlug'", {
        slug,
        childStatus: 400,
        childError: "invalid_slug",
      });
    }
    const owner = slug.slice(0, slash);
    const fnSlug = slug.slice(slash + 1);

    const targetFnId = await resolveSlug(ctx.controlPlane, ctx.token, slug);
    if (targetFnId && nextChain.some((item) => item.fnId === targetFnId)) {
      throw new SdkError("FN_CALL_DEPTH", `loop detected for ${slug}`, { slug, chain: nextChain });
    }

    const base = ctx.runtimeUrl || ctx.controlPlane;
    if (!base) {
      throw new SdkError("FN_EXECUTE_FAILED", "runtime url is not configured", {
        slug,
        childStatus: 500,
        childError: "no_runtime_url",
      });
    }

    const timeoutMs = Math.max(
      1,
      Math.min(Number(options?.timeoutMs ?? DEFAULT_EXECUTE_TIMEOUT_MS), 300_000),
    );
    let res: Response;
    try {
      res = await fetch(`${base}/run/${owner}/${fnSlug}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-hostfunc-call-chain": JSON.stringify(nextChain),
          "x-hostfunc-parent-exec": ctx.execId,
          ...(ctx.debug ? { "x-hostfunc-debug": "1" } : {}),
        },
        body: JSON.stringify(input ?? {}),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      const err = error as { name?: string; message?: string };
      if (err?.name === "AbortError" || err?.name === "TimeoutError") {
        throw new SdkError("FN_CALL_TIMEOUT", `executeFunction timed out after ${timeoutMs}ms`, {
          slug,
          timeoutMs,
        });
      }
      throw new SdkError("FN_EXECUTE_FAILED", `executeFunction network error: ${err?.message ?? String(error)}`, {
        slug,
        childStatus: 0,
        childError: "network_error",
      });
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let childJson: Record<string, unknown> | null = null;
      try {
        childJson = text ? (JSON.parse(text) as Record<string, unknown>) : null;
      } catch {
        childJson = null;
      }
      throw new SdkError("FN_EXECUTE_FAILED", `executeFunction failed with ${res.status}`, {
        slug,
        childStatus: res.status,
        childError: typeof childJson?.error === "string" ? childJson.error : null,
        childMessage: typeof childJson?.message === "string" ? childJson.message : text || null,
        childExecId: res.headers.get("x-hostfunc-exec-id"),
      });
    }

    const text = await res.text();
    if (!text) return null as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as T;
    }
  },

  log(level: "debug" | "info" | "warn" | "error", message: string, fields?: JsonObject): void {
    const logger = (globalThis as Record<string, unknown>).__hostfunc_log as
      | ((entry: { level: string; message: string; fields?: JsonObject }) => void)
      | undefined;
    if (typeof logger === "function") {
      const entry = fields ? { level, message, fields } : { level, message };
      logger(entry);
      return;
    }
    const consoleMethod =
      level === "debug" ? console.debug : level === "warn" ? console.warn : level === "error" ? console.error : console.log;
    consoleMethod(`[hostfunc:${level}] ${message}`, fields ?? {});
  },
};
