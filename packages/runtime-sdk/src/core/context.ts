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
  isEnvFallback: false,
};

function readEnv(name: string): string {
  const globalAny = globalThis as unknown as {
    process?: { env?: Record<string, string | undefined> };
  };
  const value = globalAny.process?.env?.[name];
  return typeof value === "string" ? value : "";
}

export function getContext(): RuntimeContext {
  const scoped = (globalThis as Record<string, unknown>).__hostfunc_context;
  if (!scoped || typeof scoped !== "object") {
    const token = readEnv("HOSTFUNC_API_KEY");
    const fnId = readEnv("HOSTFUNC_FN_ID");
    const controlPlane = readEnv("HOSTFUNC_CONTROL_PLANE_URL");
    const runtimeUrl = readEnv("HOSTFUNC_RUNTIME_URL") || controlPlane;
    return {
      ...DEFAULT_CONTEXT,
      fnId,
      token,
      controlPlane,
      runtimeUrl,
      isEnvFallback: Boolean(token || controlPlane || runtimeUrl),
    };
  }
  const candidate = scoped as Partial<RuntimeContext>;
  const envToken = readEnv("HOSTFUNC_API_KEY");
  const envFnId = readEnv("HOSTFUNC_FN_ID");
  const envControlPlane = readEnv("HOSTFUNC_CONTROL_PLANE_URL");
  const envRuntimeUrl = readEnv("HOSTFUNC_RUNTIME_URL");
  return {
    execId: candidate.execId ?? "",
    fnId: candidate.fnId ?? envFnId,
    orgId: candidate.orgId ?? "",
    token: candidate.token ?? envToken,
    controlPlane: candidate.controlPlane ?? envControlPlane,
    runtimeUrl: candidate.runtimeUrl ?? envRuntimeUrl ?? candidate.controlPlane ?? envControlPlane,
    callChain: Array.isArray(candidate.callChain) ? candidate.callChain : [],
    maxCallDepth: Number(candidate.maxCallDepth ?? 3),
    debug: candidate.debug === true,
    isEnvFallback:
      !candidate.execId && !candidate.fnId && !candidate.orgId && Boolean(envToken || envControlPlane || envRuntimeUrl),
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
