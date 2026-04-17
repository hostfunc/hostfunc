import { SdkError, type RuntimeContext } from "./types";

const DEFAULT_CONTEXT: RuntimeContext = {
  execId: "",
  fnId: "",
  orgId: "",
  token: "",
  controlPlane: "",
  runtimeUrl: "",
  callChain: [],
  maxCallDepth: 3,
  debug: false,
};

export function getContext(): RuntimeContext {
  const scoped = (globalThis as Record<string, unknown>).__hostfunc_context;
  if (!scoped || typeof scoped !== "object") return DEFAULT_CONTEXT;
  const candidate = scoped as Partial<RuntimeContext>;
  return {
    execId: candidate.execId ?? "",
    fnId: candidate.fnId ?? "",
    orgId: candidate.orgId ?? "",
    token: candidate.token ?? "",
    controlPlane: candidate.controlPlane ?? "",
    runtimeUrl: candidate.runtimeUrl ?? "",
    callChain: Array.isArray(candidate.callChain) ? candidate.callChain : [],
    maxCallDepth: Number(candidate.maxCallDepth ?? 3),
    debug: candidate.debug === true,
  };
}

export function requireControlPlane(): string {
  const ctx = getContext();
  if (!ctx.controlPlane) {
    throw new SdkError(
      "INFRA_EXECUTE_FAILED",
      "control plane is unavailable in this runtime context",
    );
  }
  return ctx.controlPlane;
}
