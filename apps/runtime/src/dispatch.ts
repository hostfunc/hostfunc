/// <reference types="@cloudflare/workers-types" />

interface Env {
  ENV: string;
  LOOKUP_API_URL?: string;
  LOOKUP_API_TOKEN?: string;
}

interface FnLookup {
  ok: true;
  fnId: string;
  orgId: string;
  scriptName: string;
  visibility: "public" | "private";
}

interface FnLookupError {
  ok: false;
  error: string;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
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
      lookup = await resolveFunction(env, owner, fnSlug);
    } catch (e) {
      return json({ error: "lookup_failed", message: String(e) }, 502);
    }
    if (!lookup.ok) return json({ error: lookup.error }, 404);

    const upstreamReq = new Request(req, {
      headers: withHostfuncHeaders(req.headers, lookup),
    });

    const start = Date.now();
    try {
      const upstream = await fetch(resolveWorkerUrl(lookup.scriptName, req.url), upstreamReq);
      const out = new Response(upstream.body, upstream);
      out.headers.set("x-hostfunc-wall-ms", String(Date.now() - start));
      for (const [k, v] of Object.entries(corsHeaders())) {
        out.headers.set(k, v);
      }
      return out;
    } catch (e) {
      return json(
        { error: "execution_failed", message: e instanceof Error ? e.message : String(e) },
        500,
      );
    }
  },
};

function resolveWorkerUrl(scriptName: string, requestUrl: string): string {
  const incoming = new URL(requestUrl);
  incoming.hostname = `${scriptName}.${incoming.hostname}`;
  return incoming.toString();
}

function withHostfuncHeaders(inbound: Headers, lookup: FnLookup): Headers {
  const execId = crypto.randomUUID();
  const headers = new Headers(inbound);
  headers.set("x-hostfunc-exec-id", execId);
  headers.set("x-hostfunc-fn-id", lookup.fnId);
  headers.set("x-hostfunc-org-id", lookup.orgId);
  return headers;
}

async function resolveFunction(env: Env, owner: string, slug: string): Promise<FnLookup | FnLookupError> {
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
    "access-control-allow-headers": "content-type,authorization",
  };
}
