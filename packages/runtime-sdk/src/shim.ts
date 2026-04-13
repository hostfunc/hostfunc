// packages/runtime-sdk/src/shim.ts
// This file is the contents of the virtual @hostfunc/fn module.

import { HostFuncError } from "@hostfunc/executor-core";

declare const __hostfunc_RUNTIME__: {
  controlPlane: string; // "https://api.hostfunc.internal"
  // (set at bundle time per environment)
};

function ctxFromRequest(req: Request) {
  return {
    execId: req.headers.get("x-hostfunc-exec-id") ?? "",
    fnId: req.headers.get("x-hostfunc-fn-id") ?? "",
    orgId: req.headers.get("x-hostfunc-org-id") ?? "",
    chain: JSON.parse(req.headers.get("x-hostfunc-call-chain") || "[]"),
    limits: JSON.parse(req.headers.get("x-hostfunc-limits") || "{}"),
  };
}

export const fn = {
  async executeFunction<T = unknown>(slug: string, input?: unknown): Promise<T> {
    const ctx = ctxFromRequest(new Request("http://localhost")); // tracked via AsyncLocalStorage on entry
    const nextChain = [...ctx.chain, { functionId: ctx.fnId, executionId: ctx.execId }];
    if (nextChain.length > ctx.limits.maxCallDepth) {
      throw new HostFuncError("FN_CALL_DEPTH", `max depth ${ctx.limits.maxCallDepth}`);
    }
    const res = await fetch(`${__hostfunc_RUNTIME__.controlPlane}/run/${slug}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hostfunc-call-chain": JSON.stringify(nextChain),
        "x-hostfunc-parent-exec": ctx.execId,
      },
      body: JSON.stringify(input ?? {}),
    });
    if (!res.ok) {
      throw new HostFuncError("INFRA_EXECUTE_FAILED", await res.text());
    }
    return res.json() as Promise<T>;
  },
};

export const secret = {
  async get(key: string): Promise<string | null> {
    const ctx = ctxFromRequest(new Request("http://localhost"));
    const res = await fetch(`${__hostfunc_RUNTIME__.controlPlane}/secrets/get`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ execId: ctx.execId, fnId: ctx.fnId, key }),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new HostFuncError("INFRA_EXECUTE_FAILED", await res.text());
    const { value } = (await res.json()) as { value: string };
    // Tag the secret value so the tail worker's redactor knows to scrub it.
    // registerSecretForRedaction(value);
    return value;
  },
  async getRequired(key: string): Promise<string> {
    const v = await this.get(key);
    if (v == null) throw new HostFuncError("FN_THREW", `missing secret: ${key}`);
    return v;
  },
};
