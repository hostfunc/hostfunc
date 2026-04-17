/// <reference types="@cloudflare/workers-types" />

interface Env {
  ENV: string;
  LOOKUP_API_URL?: string;
  LOOKUP_API_TOKEN?: string;
  WORKERS_SUBDOMAIN?: string;
  RUNTIME_PUBLIC_URL?: string;
  FN_INDEX?: KVNamespace;
  DISPATCHER?: DispatchNamespace;
}

interface FnLookup {
  ok: true;
  fnId: string;
  orgId: string;
  versionId: string;
  scriptName: string;
  visibility: "public" | "private";
}

interface FnLookupError {
  ok: false;
  error: string;
}

interface RegisterResponse {
  token: string;
  expiresAt: number;
  maxCallDepth?: number;
  wallMs?: number;
}

interface CallChainFrame {
  fnId: string;
  execId: string;
}

const DEFAULT_WALL_MS = 10_000;
const DEFAULT_MAX_CALL_DEPTH = 3;
const LOOKUP_CACHE_TTL_SECONDS = 60;

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const match = url.pathname.match(/^\/run\/([^/]+)\/([^/]+)$/);
    if (!match) return json({ error: "not_found" }, 404);
    const [, orgSlug, fnSlug] = match;
    if (!orgSlug || !fnSlug) return json({ error: "not_found" }, 404);
    if (orgSlug.startsWith("usr_")) {
      return json(
        {
          error: "legacy_run_url",
          message:
            "Legacy owner-based run URLs are no longer supported. Use /run/{orgSlug}/{slug}.",
        },
        410,
      );
    }

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    let lookup: FnLookup | FnLookupError;
    try {
      lookup = await resolveFunctionCached(env, orgSlug, fnSlug);
    } catch (e) {
      return json({ error: "lookup_failed", message: String(e) }, 502);
    }
    if (!lookup.ok) return json({ error: lookup.error }, 404);

    const callChain = parseCallChain(req.headers.get("x-hostfunc-call-chain"));
    const execId = crypto.randomUUID();

    let registration: RegisterResponse;
    try {
      registration = await registerExecution(env, {
        execId,
        fnId: lookup.fnId,
        orgId: lookup.orgId,
        wallMs: DEFAULT_WALL_MS,
        callChain,
      });
    } catch (e) {
      return json({ error: "register_failed", message: String(e) }, 502);
    }

    await startExecutionRecord(env, {
      execId,
      fnId: lookup.fnId,
      versionId: lookup.versionId,
      orgId: lookup.orgId,
      parentExecutionId: req.headers.get("x-hostfunc-parent-exec"),
      callDepth: callChain.length,
      triggerKind:
        (req.headers.get("x-hostfunc-trigger-kind") as
          | "http"
          | "cron"
          | "email"
          | "mcp"
          | "fn_call"
          | null) ?? "http",
    }).catch((error) => {
      console.error(
        "[dispatch] start execution record failed",
        JSON.stringify({
          execId,
          fnId: lookup.fnId,
          orgId: lookup.orgId,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    });

    ctx.waitUntil(
      unregisterExecution(env, execId).catch((e) =>
        console.error("[dispatch] unregister failed", e instanceof Error ? e.message : String(e)),
      ),
    );

    const runtimeUrl = resolveRuntimeUrl(req.url, env.RUNTIME_PUBLIC_URL);

    const upstreamReq = new Request(req, {
      headers: withHostfuncHeaders(req.headers, lookup, {
        execId,
        execToken: registration.token,
        controlPlane: env.LOOKUP_API_URL ?? "",
        runtimeUrl,
        callChain,
        maxCallDepth: registration.maxCallDepth ?? DEFAULT_MAX_CALL_DEPTH,
      }),
    });

    const start = Date.now();
    try {
      const script = env.DISPATCHER?.get(lookup.scriptName);
      let upstream: Response;
      if (script) {
        try {
          upstream = await script.fetch(upstreamReq.clone());
        } catch {
          // DISPATCHER unavailable in wrangler dev --local; fall back to HTTP.
          upstream = await fetch(
            resolveWorkerUrl(lookup.scriptName, env.WORKERS_SUBDOMAIN),
            upstreamReq,
          );
        }
      } else {
        upstream = await fetch(
          resolveWorkerUrl(lookup.scriptName, env.WORKERS_SUBDOMAIN),
          upstreamReq,
        );
      }

      // Peek at the body so we can enrich ingested logs with the structured
      // error info the worker emits (e.g. "missing_secret", "fn_execute_failed")
      // without losing the original response to the caller.
      let childError: StructuredChildError | null = null;
      let bodyForClient: BodyInit | null = upstream.body;
      if (!upstream.ok) {
        const clone = upstream.clone();
        const text = await clone.text().catch(() => "");
        childError = parseStructuredChildError(text, upstream.status);
        bodyForClient = text;
      }

      const out = new Response(bodyForClient, upstream);
      out.headers.set("x-hostfunc-wall-ms", String(Date.now() - start));
      out.headers.set("x-hostfunc-exec-id", execId);
      ctx.waitUntil(
        ingestExecution(env, {
          executionId: execId,
          status: upstream.ok ? "ok" : "fn_error",
          wallMs: Date.now() - start,
          errorMessage: upstream.ok
            ? null
            : formatChildErrorMessage(childError, upstream.status),
          source: "runtime",
          externalId: `${execId}:runtime:final`,
          logs: [
            {
              level: upstream.ok ? "info" : "error",
              message: upstream.ok
                ? "Execution completed successfully."
                : formatChildErrorMessage(childError, upstream.status),
              fields: {
                status: upstream.status,
                statusText: upstream.statusText,
                wallMs: Date.now() - start,
                ...(childError ? { error: childError } : {}),
              },
              ts: new Date().toISOString(),
            },
          ],
        }).catch(() => undefined),
      );
      for (const [k, v] of Object.entries(corsHeaders())) {
        out.headers.set(k, v);
      }
      return out;
    } catch (e) {
      ctx.waitUntil(
        ingestExecution(env, {
          executionId: execId,
          status: "infra_error",
          wallMs: Date.now() - start,
          errorMessage: e instanceof Error ? e.message : String(e),
          source: "runtime",
          externalId: `${execId}:runtime:error`,
          logs: [
            {
              level: "error",
              message: "Runtime dispatch failed before function response.",
              fields: {
                wallMs: Date.now() - start,
                error: e instanceof Error ? e.message : String(e),
              },
              ts: new Date().toISOString(),
            },
          ],
        }).catch(() => undefined),
      );
      return json(
        { error: "execution_failed", message: e instanceof Error ? e.message : String(e) },
        500,
      );
    }
  },
};

function resolveWorkerUrl(scriptName: string, workersSubdomain?: string): string {
  if (workersSubdomain) {
    return `https://${scriptName}.${workersSubdomain}.workers.dev`;
  }
  return `https://${scriptName}.workers.dev`;
}

function withHostfuncHeaders(
  inbound: Headers,
  lookup: FnLookup,
  input: {
    execId: string;
    execToken: string;
    controlPlane: string;
    runtimeUrl: string;
    callChain: CallChainFrame[];
    maxCallDepth: number;
  },
): Headers {
  const headers = new Headers(inbound);
  headers.set("x-hostfunc-exec-id", input.execId);
  headers.set("x-hostfunc-fn-id", lookup.fnId);
  headers.set("x-hostfunc-org-id", lookup.orgId);
  headers.set("x-hostfunc-exec-token", input.execToken);
  headers.set("x-hostfunc-control-plane", input.controlPlane);
  headers.set("x-hostfunc-runtime-url", input.runtimeUrl);
  headers.set("x-hostfunc-call-chain", JSON.stringify(input.callChain));
  headers.set("x-hostfunc-max-call-depth", String(input.maxCallDepth));
  return headers;
}

function resolveRuntimeUrl(requestUrl: string, publicOverride?: string): string {
  if (publicOverride) return publicOverride.replace(/\/+$/, "");
  try {
    return new URL(requestUrl).origin;
  } catch {
    return "";
  }
}

async function resolveFunction(
  env: Env,
  orgSlug: string,
  slug: string,
): Promise<FnLookup | FnLookupError> {
  if (!env.LOOKUP_API_URL || !env.LOOKUP_API_TOKEN) {
    return { ok: false, error: "lookup_not_configured" };
  }
  const res = await fetch(
    `${env.LOOKUP_API_URL}/api/internal/lookup?org=${encodeURIComponent(orgSlug)}&slug=${encodeURIComponent(slug)}`,
    {
      headers: { Authorization: `Bearer ${env.LOOKUP_API_TOKEN}` },
    },
  );
  if (res.status === 404) return { ok: false, error: "fn_not_found" };
  if (!res.ok) throw new Error(`lookup status ${res.status}`);
  return (await res.json()) as FnLookup;
}

async function startExecutionRecord(
  env: Env,
  input: {
    execId: string;
    fnId: string;
    versionId: string;
    orgId: string;
    parentExecutionId: string | null;
    callDepth: number;
    triggerKind: "http" | "cron" | "email" | "mcp" | "fn_call";
  },
) {
  if (!env.LOOKUP_API_URL || !env.LOOKUP_API_TOKEN) return;
  const res = await fetch(`${env.LOOKUP_API_URL}/api/internal/exec/start`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.LOOKUP_API_TOKEN}`,
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`exec_start_status_${res.status}${text ? `:${text}` : ""}`);
  }
}

async function resolveFunctionCached(
  env: Env,
  orgSlug: string,
  slug: string,
): Promise<FnLookup | FnLookupError> {
  const cacheKey = `${orgSlug}:${slug}`;
  if (env.FN_INDEX) {
    const hit = await env.FN_INDEX.get(cacheKey, "json");
    if (hit) return hit as FnLookup;
  }

  const resolved = await resolveFunction(env, orgSlug, slug);
  if (env.FN_INDEX && resolved.ok) {
    await env.FN_INDEX.put(cacheKey, JSON.stringify(resolved), {
      expirationTtl: LOOKUP_CACHE_TTL_SECONDS,
    });
  }
  return resolved;
}

async function registerExecution(
  env: Env,
  input: {
    execId: string;
    fnId: string;
    orgId: string;
    wallMs: number;
    callChain: CallChainFrame[];
  },
): Promise<RegisterResponse> {
  if (!env.LOOKUP_API_URL || !env.LOOKUP_API_TOKEN) {
    throw new Error("lookup_not_configured");
  }
  const res = await fetch(`${env.LOOKUP_API_URL}/api/internal/exec/register`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.LOOKUP_API_TOKEN}`,
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`register status ${res.status}`);
  return (await res.json()) as RegisterResponse;
}

async function unregisterExecution(env: Env, execId: string): Promise<void> {
  if (!env.LOOKUP_API_URL || !env.LOOKUP_API_TOKEN) return;
  await fetch(`${env.LOOKUP_API_URL}/api/internal/exec/unregister`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.LOOKUP_API_TOKEN}`,
    },
    body: JSON.stringify({ execId }),
  });
}

async function ingestExecution(
  env: Env,
  input: {
    executionId: string;
    status: "ok" | "fn_error" | "limit_exceeded" | "infra_error";
    wallMs: number;
    errorMessage?: string | null;
    logs?: Array<{
      level: "debug" | "info" | "warn" | "error";
      message: string;
      fields?: Record<string, unknown>;
      ts?: string;
    }>;
    source?: string;
    externalId?: string;
  },
) {
  if (!env.LOOKUP_API_URL || !env.LOOKUP_API_TOKEN) return;
  await fetch(`${env.LOOKUP_API_URL}/api/internal/ingest`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.LOOKUP_API_TOKEN}`,
    },
    body: JSON.stringify(input),
  });
}

interface StructuredChildError {
  error: string;
  message?: string;
  key?: string;
  slug?: string;
  childStatus?: number;
  childError?: string;
  childMessage?: string;
  childExecId?: string;
  maxDepth?: number;
  timeoutMs?: number;
  docsUrl?: string;
}

function parseStructuredChildError(
  text: string,
  _status: number,
): StructuredChildError | null {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (typeof parsed !== "object" || parsed === null) return null;
    const error = typeof parsed.error === "string" ? parsed.error : null;
    if (!error) return null;
    const out: StructuredChildError = { error };
    if (typeof parsed.message === "string") out.message = parsed.message;
    if (typeof parsed.key === "string") out.key = parsed.key;
    if (typeof parsed.slug === "string") out.slug = parsed.slug;
    if (typeof parsed.childStatus === "number") out.childStatus = parsed.childStatus;
    if (typeof parsed.childError === "string") out.childError = parsed.childError;
    if (typeof parsed.childMessage === "string") out.childMessage = parsed.childMessage;
    if (typeof parsed.childExecId === "string") out.childExecId = parsed.childExecId;
    if (typeof parsed.maxDepth === "number") out.maxDepth = parsed.maxDepth;
    if (typeof parsed.timeoutMs === "number") out.timeoutMs = parsed.timeoutMs;
    if (typeof parsed.docsUrl === "string") out.docsUrl = parsed.docsUrl;
    return out;
  } catch {
    return null;
  }
}

function formatChildErrorMessage(
  err: StructuredChildError | null,
  status: number,
): string {
  if (!err) return `Execution returned non-ok response (${status}).`;
  switch (err.error) {
    case "missing_secret":
      return `Missing required secret${err.key ? `: ${err.key}` : ""}.`;
    case "fn_call_depth":
      return `Function call depth exceeded${err.maxDepth ? ` (max ${err.maxDepth})` : ""}.`;
    case "fn_call_timeout":
      return `Function call timed out${err.slug ? ` while calling ${err.slug}` : ""}.`;
    case "fn_execute_failed":
      return `Child function failed${err.slug ? ` (${err.slug})` : ""}${
        err.childStatus ? ` with status ${err.childStatus}` : ""
      }${err.childMessage ? `: ${err.childMessage}` : ""}.`;
    case "fn_threw":
      return err.message ? `Function threw: ${err.message}` : "Function threw.";
    case "fn_invalid":
      return err.message ?? "Function is invalid.";
    default:
      return err.message ?? `Execution failed (${err.error}).`;
  }
}

function parseCallChain(raw: string | null): CallChainFrame[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (value): value is CallChainFrame =>
          typeof value === "object" &&
          value !== null &&
          typeof (value as { fnId?: unknown }).fnId === "string" &&
          typeof (value as { execId?: unknown }).execId === "string",
      )
      .map((entry) => ({ fnId: entry.fnId, execId: entry.execId }));
  } catch {
    return [];
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders() },
  });
}

function corsHeaders(): Record<string, string> {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    "access-control-allow-headers":
      "content-type,authorization,x-hostfunc-call-chain,x-hostfunc-parent-exec,x-hostfunc-debug",
  };
}
