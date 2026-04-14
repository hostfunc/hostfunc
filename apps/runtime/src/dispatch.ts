/// <reference types="@cloudflare/workers-types" />

interface Env {
  ENV: string;
  LOOKUP_API_URL?: string;
  LOOKUP_API_TOKEN?: string;
  WORKERS_SUBDOMAIN?: string;
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
    const [, owner, fnSlug] = match;
    if (!owner || !fnSlug) return json({ error: "not_found" }, 404);

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    let lookup: FnLookup | FnLookupError;
    try {
      lookup = await resolveFunctionCached(env, owner, fnSlug);
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
      triggerKind: (req.headers.get("x-hostfunc-trigger-kind") as
        | "http"
        | "cron"
        | "email"
        | "mcp"
        | "fn_call"
        | null) ?? "http",
    }).catch(() => undefined);

    ctx.waitUntil(
      unregisterExecution(env, execId).catch((e) =>
        console.error("[dispatch] unregister failed", e instanceof Error ? e.message : String(e)),
      ),
    );

    const upstreamReq = new Request(req, {
      headers: withHostfuncHeaders(req.headers, lookup, {
        execId,
        execToken: registration.token,
        controlPlane: env.LOOKUP_API_URL ?? "",
        callChain,
      }),
    });

    const start = Date.now();
    try {
      const script = env.DISPATCHER?.get(lookup.scriptName);
      const upstream = script
        ? await script.fetch(upstreamReq)
        : await fetch(resolveWorkerUrl(lookup.scriptName, req.url, env.WORKERS_SUBDOMAIN), upstreamReq);
      const out = new Response(upstream.body, upstream);
      out.headers.set("x-hostfunc-wall-ms", String(Date.now() - start));
      out.headers.set("x-hostfunc-exec-id", execId);
      ctx.waitUntil(
        ingestExecution(env, {
          executionId: execId,
          status: upstream.ok ? "ok" : "fn_error",
          wallMs: Date.now() - start,
          errorMessage: upstream.ok ? null : "function returned non-ok response",
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
        }).catch(() => undefined),
      );
      return json(
        { error: "execution_failed", message: e instanceof Error ? e.message : String(e) },
        500,
      );
    }
  },
};

function resolveWorkerUrl(scriptName: string, requestUrl: string, workersSubdomain?: string): string {
  const incoming = new URL(requestUrl);
  if (incoming.hostname === "localhost" || incoming.hostname === "127.0.0.1") {
    if (!workersSubdomain) {
      return `https://${scriptName}.workers.dev${incoming.pathname}${incoming.search}`;
    }
    return `https://${scriptName}.${workersSubdomain}.workers.dev${incoming.pathname}${incoming.search}`;
  }
  incoming.hostname = `${scriptName}.${incoming.hostname}`;
  return incoming.toString();
}

function withHostfuncHeaders(
  inbound: Headers,
  lookup: FnLookup,
  input: {
    execId: string;
    execToken: string;
    controlPlane: string;
    callChain: CallChainFrame[];
  },
): Headers {
  const headers = new Headers(inbound);
  headers.set("x-hostfunc-exec-id", input.execId);
  headers.set("x-hostfunc-fn-id", lookup.fnId);
  headers.set("x-hostfunc-org-id", lookup.orgId);
  headers.set("x-hostfunc-exec-token", input.execToken);
  headers.set("x-hostfunc-control-plane", input.controlPlane);
  headers.set("x-hostfunc-call-chain", JSON.stringify(input.callChain));
  headers.set("x-hostfunc-max-call-depth", String(DEFAULT_MAX_CALL_DEPTH));
  return headers;
}

async function resolveFunction(
  env: Env,
  owner: string,
  slug: string,
): Promise<FnLookup | FnLookupError> {
  if (!env.LOOKUP_API_URL || !env.LOOKUP_API_TOKEN) {
    return { ok: false, error: "lookup_not_configured" };
  }
  const res = await fetch(
    `${env.LOOKUP_API_URL}/api/internal/lookup?owner=${encodeURIComponent(owner)}&slug=${encodeURIComponent(slug)}`,
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
  await fetch(`${env.LOOKUP_API_URL}/api/internal/exec/start`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.LOOKUP_API_TOKEN}`,
    },
    body: JSON.stringify(input),
  });
}

async function resolveFunctionCached(
  env: Env,
  owner: string,
  slug: string,
): Promise<FnLookup | FnLookupError> {
  const cacheKey = `${owner}:${slug}`;
  if (env.FN_INDEX) {
    const hit = await env.FN_INDEX.get(cacheKey, "json");
    if (hit) return hit as FnLookup;
  }

  const resolved = await resolveFunction(env, owner, slug);
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
      "content-type,authorization,x-hostfunc-call-chain,x-hostfunc-parent-exec",
  };
}
