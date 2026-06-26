import { type BuildResult, type Message, build } from "esbuild";
import { compileClientBundle } from "./client-bundler.js";

export interface BundleAsset {
  path: string;
  mime: string;
  content: Buffer | Uint8Array;
}

export interface BundleOptions {
  /** User-authored TypeScript source. */
  code: string;
  /** Function id, used for source-map filenames. */
  fnId: string;
  /** Version id; embedded as a build-time define so the SDK can find KV blobs. */
  versionId?: string;
  /** Asset blobs to embed directly into the worker module (small ones only). */
  assets?: BundleAsset[];
  /** Hard upper bound for the user-authored code. Defaults to 1_000_000. */
  maxSizeBytes?: number;
}

export interface SkippedAsset {
  path: string;
  reason: "too_large" | "budget_exhausted";
}

export interface BundleResult {
  code: string;
  sourceMap?: string;
  sizeBytes: number;
  warnings: string[];
  /** Asset paths embedded directly into the bundle — no KV needed at runtime. */
  embeddedAssetPaths: string[];
  /** Assets too large / over budget to embed; still need the KV fallback. */
  skippedAssets: SkippedAsset[];
}

export class BundleError extends Error {
  constructor(
    message: string,
    public readonly errors: Message[],
  ) {
    super(message);
    this.name = "BundleError";
  }
}

const RUNTIME_SHIM = `
// Injected by hostfunc at deploy time. Provides @hostfunc/fn to user code.
const __ofn_state = { request: null, env: null };

// Decodes a base64 string to bytes. atob yields a Latin-1 binary string, so a
// per-char code copy is the correct (and binary-safe) decode in a Worker.
function __ofn_b64_to_bytes(b64) {
  if (b64 === "") return new Uint8Array(0);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const __ofn_assets_module = {
  _key(path) {
    if (typeof path !== "string" || !path.length) {
      throw new HostfuncError("FN_INPUT_INVALID", "asset path is required");
    }
    let p = path.replace(/\\\\/g, "/").replace(/^\\.\\//, "").replace(/^\\/+/, "");
    if (!p) throw new HostfuncError("FN_INPUT_INVALID", "asset path is required");
    return p;
  },
  async _fetchFromControlPlane(path) {
    const ctx = __ofn_ctx();
    const versionId = ctx.versionId || __HOSTFUNC_VERSION_ID__;
    if (!ctx.controlPlane || !ctx.fnId || !versionId || !ctx.token) {
      throw new HostfuncError("INFRA_EXECUTE_FAILED", "asset service unavailable");
    }
    const url = ctx.controlPlane + "/api/internal/assets/" + ctx.fnId + "/" + versionId + "/" + path;
    const res = await fetch(url, {
      headers: { authorization: "Bearer " + ctx.token },
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new HostfuncError("INFRA_EXECUTE_FAILED", "asset fetch failed (" + res.status + ")");
    }
    return res;
  },
  async bytes(path) {
    const key = this._key(path);
    // Assets embedded into the bundle at deploy time take priority — they need
    // no KV binding and no control-plane round-trip.
    if (Object.prototype.hasOwnProperty.call(__OFN_EMBEDDED_ASSETS, key)) {
      return __ofn_b64_to_bytes(__OFN_EMBEDDED_ASSETS[key]);
    }
    const env = __ofn_state.env;
    const ctx = __ofn_ctx();
    const versionId = ctx.versionId || __HOSTFUNC_VERSION_ID__;
    if (env && env.FN_ASSETS_KV && typeof env.FN_ASSETS_KV.get === "function" && versionId) {
      const kvKey = (ctx.fnId || __HOSTFUNC_FN_ID__) + "@" + versionId + "/" + key;
      const buf = await env.FN_ASSETS_KV.get(kvKey, "arrayBuffer");
      if (buf) return new Uint8Array(buf);
    }
    const res = await this._fetchFromControlPlane(key);
    if (!res) return null;
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  },
  async text(path) {
    const bytes = await this.bytes(path);
    if (!bytes) return null;
    return new TextDecoder().decode(bytes);
  },
  url(path) {
    const ctx = __ofn_ctx();
    if (!ctx.controlPlane || !ctx.fnId) return null;
    return ctx.controlPlane + "/api/marketplace/" + ctx.fnId + "/assets/" + this._key(path);
  },
};

const __ofn_ctx = () => {
  const req = __ofn_state.request;
  if (!req) throw new Error("hostfunc: no active request");
  const runtimeEnv = __ofn_state.env;
  const controlPlane = req.headers.get("x-hostfunc-control-plane") || "";
  const runtimeUrl = req.headers.get("x-hostfunc-runtime-url") || controlPlane;
  return {
    execId: req.headers.get("x-hostfunc-exec-id") || "",
    fnId: req.headers.get("x-hostfunc-fn-id") || "",
    versionId: req.headers.get("x-hostfunc-version-id") || __HOSTFUNC_VERSION_ID__ || "",
    orgId: req.headers.get("x-hostfunc-org-id") || "",
    token:
      req.headers.get("x-hostfunc-exec-token") ||
      (runtimeEnv && runtimeEnv.HOSTFUNC_API_KEY ? runtimeEnv.HOSTFUNC_API_KEY : "") ||
      "",
    controlPlane,
    runtimeUrl,
    callChain: JSON.parse(req.headers.get("x-hostfunc-call-chain") || "[]"),
    maxCallDepth: Number(req.headers.get("x-hostfunc-max-call-depth") || "3"),
    debug: req.headers.get("x-hostfunc-debug") === "1",
  };
};

class HostfuncError extends Error {
  constructor(code, message, detail) {
    super(message);
    this.name = "HostfuncError";
    this.code = code;
    if (detail) this.detail = detail;
  }
}

const DEFAULT_EXECUTE_TIMEOUT_MS = 30000;

const __ofn_fn_module = {
  default: {
    async executeFunction(slug, input, options) {
      const ctx = __ofn_ctx();
      const nextChain = [...ctx.callChain, { fnId: ctx.fnId, execId: ctx.execId }];
      if (nextChain.length > ctx.maxCallDepth) {
        throw new HostfuncError(
          "FN_CALL_DEPTH",
          "max call depth " + ctx.maxCallDepth + " exceeded",
          { maxDepth: ctx.maxCallDepth, chain: nextChain }
        );
      }

      const slash = slug.indexOf("/");
      if (slash < 1) {
        throw new HostfuncError(
          "FN_EXECUTE_FAILED",
          "executeFunction slug must be 'orgSlug/fnSlug'",
          { slug, childStatus: 400, childError: "invalid_slug" }
        );
      }
      const owner = slug.slice(0, slash);
      const fnSlug = slug.slice(slash + 1);

      // Best-effort cycle detection: don't fail if resolver is unavailable.
      const targetFnId = await __ofn_resolve_slug(ctx, owner, fnSlug);
      if (targetFnId && nextChain.some((f) => f.fnId === targetFnId)) {
        throw new HostfuncError(
          "FN_CALL_DEPTH",
          "loop detected for " + slug,
          { slug, chain: nextChain }
        );
      }

      const base = ctx.runtimeUrl || ctx.controlPlane;
      if (!base) {
        throw new HostfuncError(
          "FN_EXECUTE_FAILED",
          "runtime url is not configured",
          { slug, childStatus: 500, childError: "no_runtime_url" }
        );
      }

      const timeoutMs = Math.max(
        1,
        Math.min(
          Number((options && options.timeoutMs) || DEFAULT_EXECUTE_TIMEOUT_MS),
          300000
        )
      );

      const headers = {
        "content-type": "application/json",
        "x-hostfunc-call-chain": JSON.stringify(nextChain),
        "x-hostfunc-parent-exec": ctx.execId,
      };
      if (ctx.debug) headers["x-hostfunc-debug"] = "1";

      let res;
      try {
        res = await fetch(base + "/run/" + owner + "/" + fnSlug, {
          method: "POST",
          headers,
          body: JSON.stringify(input ?? {}),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (err) {
        const aborted = err && (err.name === "TimeoutError" || err.name === "AbortError");
        if (aborted) {
          throw new HostfuncError(
            "FN_CALL_TIMEOUT",
            "executeFunction timed out after " + timeoutMs + "ms",
            { slug, timeoutMs }
          );
        }
        throw new HostfuncError(
          "FN_EXECUTE_FAILED",
          "executeFunction network error: " + (err && err.message ? err.message : String(err)),
          { slug, childStatus: 0, childError: "network_error" }
        );
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        let childJson = null;
        if (text) {
          try { childJson = JSON.parse(text); } catch { /* ignore */ }
        }
        throw new HostfuncError(
          "FN_EXECUTE_FAILED",
          "executeFunction failed with " + res.status,
          {
            slug,
            childStatus: res.status,
            childError: childJson && typeof childJson.error === "string" ? childJson.error : null,
            childMessage: childJson && typeof childJson.message === "string" ? childJson.message : (text || null),
            childExecId: res.headers.get("x-hostfunc-exec-id") || null,
          }
        );
      }

      const resText = await res.text();
      if (!resText) return null;
      try {
        return JSON.parse(resText);
      } catch {
        return resText;
      }
    },
  },
  secret: {
    async get(key) {
      const ctx = __ofn_ctx();
      if (!ctx.controlPlane || !ctx.token) {
        throw new HostfuncError(
          "INFRA_EXECUTE_FAILED",
          "secret service unavailable: missing control-plane headers"
        );
      }
      let res;
      try {
        res = await fetch(ctx.controlPlane + "/api/internal/secrets/get", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: "Bearer " + ctx.token,
          },
          body: JSON.stringify({ key }),
          signal: AbortSignal.timeout(10000),
        });
      } catch (err) {
        throw new HostfuncError(
          "INFRA_EXECUTE_FAILED",
          "secret service network error: " + (err && err.message ? err.message : String(err))
        );
      }
      if (res.status === 404) return null;
      if (res.status === 401 || res.status === 403) {
        throw new HostfuncError(
          "INFRA_EXECUTE_FAILED",
          "secret service unauthorized (" + res.status + ")"
        );
      }
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new HostfuncError(
          "INFRA_EXECUTE_FAILED",
          "secret fetch failed (" + res.status + ")" + (detail ? ": " + detail : "")
        );
      }
      const json = await res.json().catch(() => null);
      if (!json) return null;
      return json.found ? json.value : null;
    },
    async getRequired(key) {
      const v = await this.get(key);
      if (v == null) {
        const ctx = __ofn_ctx();
        const docsUrl = ctx.controlPlane
          ? ctx.controlPlane + "/dashboard/" + ctx.fnId + "/settings/secrets"
          : null;
        throw new HostfuncError(
          "MISSING_SECRET",
          "missing required secret: " + key,
          { key, docsUrl }
        );
      }
      return v;
    },
  },
};

async function __ofn_post_internal(path, body, timeoutMs = 30000) {
  const ctx = __ofn_ctx();
  if (!ctx.controlPlane) {
    throw new HostfuncError(
      "INFRA_EXECUTE_FAILED",
      "internal api unavailable: missing control-plane headers"
    );
  }
  const headers = { "content-type": "application/json" };
  if (ctx.token) headers.authorization = "Bearer " + ctx.token;
  const res = await fetch(ctx.controlPlane + path, {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new HostfuncError(
      "INFRA_EXECUTE_FAILED",
      "internal api request failed (" + res.status + ")" + (detail ? ": " + detail : "")
    );
  }
  return await res.json().catch(() => null);
}

const __ofn_ai_module = {
  async askAi(prompt, options) {
    return await __ofn_post_internal("/api/internal/ai/ask", { prompt, options: options ?? {} });
  },
  async *streamAi(prompt, options) {
    const result = await __ofn_ai_module.askAi(prompt, options);
    yield { type: "delta", text: result && result.text ? result.text : "" };
    yield { type: "done", done: true };
  },
  async createEmbedding(text, options) {
    return await __ofn_post_internal("/api/internal/ai/embed", { text, options: options ?? {} });
  },
};

const __ofn_agent_module = {
  async createAgent(config) {
    return await __ofn_post_internal("/api/internal/agents/create", { config });
  },
  async runAgent(config) {
    return await __ofn_post_internal("/api/internal/agents/run", { config });
  },
};

const __ofn_vector_module = {
  async upsert(namespace, vectors) {
    return await __ofn_post_internal("/api/internal/vector/upsert", { namespace, vectors });
  },
  async query(namespace, embedding, options) {
    return await __ofn_post_internal("/api/internal/vector/query", {
      namespace,
      embedding,
      topK: options && options.topK != null ? options.topK : 8,
      includeValues: Boolean(options && options.includeValues),
    });
  },
  async deleteVectors(namespace, ids) {
    return await __ofn_post_internal("/api/internal/vector/delete", { namespace, ids });
  },
  getNamespace(namespace) {
    return {
      upsert(vectors) {
        return __ofn_vector_module.upsert(namespace, vectors);
      },
      query(embedding, options) {
        return __ofn_vector_module.query(namespace, embedding, options);
      },
      deleteVectors(ids) {
        return __ofn_vector_module.deleteVectors(namespace, ids);
      },
    };
  },
};

async function __ofn_resolve_slug(ctx, owner, fnSlug) {
  if (!ctx.controlPlane || !ctx.token) return null;
  try {
    const url =
      ctx.controlPlane +
      "/api/internal/resolve?slug=" +
      encodeURIComponent(owner + "/" + fnSlug);
    const res = await fetch(url, {
      headers: { authorization: "Bearer " + ctx.token },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    return (json && json.fnId) || null;
  } catch {
    return null;
  }
}
`;

const ENTRY_WRAPPER = (userCode: string, embeddedAssetsLiteral: string) => `
// Static assets embedded at deploy time (normalized path -> base64). {} when none.
const __OFN_EMBEDDED_ASSETS = ${embeddedAssetsLiteral};
${RUNTIME_SHIM}

// Virtual module: @hostfunc/fn
const __ofn_fn = __ofn_fn_module.default;
__ofn_fn.assets = __ofn_assets_module;
const fn = __ofn_fn;
const secret = __ofn_fn_module.secret;
const assets = __ofn_assets_module;
const askAi = __ofn_ai_module.askAi;
const streamAi = __ofn_ai_module.streamAi;
const createEmbedding = __ofn_ai_module.createEmbedding;
const createAgent = __ofn_agent_module.createAgent;
const runAgent = __ofn_agent_module.runAgent;
const upsert = __ofn_vector_module.upsert;
const query = __ofn_vector_module.query;
const deleteVectors = __ofn_vector_module.deleteVectors;
const getNamespace = __ofn_vector_module.getNamespace;

// User code begins
${userCode}
// User code ends

// --- hostfunc static HTML / asset serving -------------------------------
const __OFN_HTML_CSP =
  "sandbox allow-scripts; default-src 'self' data: blob:; img-src 'self' data: blob:; " +
  "style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data:; " +
  "connect-src 'self'; frame-ancestors 'self'";
const __OFN_ASSET_MIME = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
};
function __ofn_asset_mime(path) {
  const ext = (path.split(".").pop() || "").toLowerCase();
  return __OFN_ASSET_MIME[ext] || "application/octet-stream";
}
function __ofn_inject_head(html, tags) {
  if (!tags) return html;
  const head = html.match(/<head[^>]*>/i);
  if (head && head.index != null) {
    const at = head.index + head[0].length;
    return html.slice(0, at) + tags + html.slice(at);
  }
  const htmlTag = html.match(/<html[^>]*>/i);
  if (htmlTag && htmlTag.index != null) {
    const at = htmlTag.index + htmlTag[0].length;
    return html.slice(0, at) + "<head>" + tags + "</head>" + html.slice(at);
  }
  return tags + html;
}
function __ofn_inject_base(html, runPath) {
  if (!runPath) return html;
  const tag = '<base href="' + runPath + (runPath.endsWith("/") ? "" : "/") + '">';
  return __ofn_inject_head(html, tag);
}
// Give every served page a tab icon. We only add the default when the document
// declares no icon of its own, and point it at favicon.ico (resolved against the
// injected <base>), so an uploaded favicon.ico just works on both the path-routed
// and per-function-subdomain hosts. A missing favicon.ico 404s harmlessly.
function __ofn_inject_favicon(html) {
  if (/<link[^>]+rel\s*=\s*["'][^"']*icon[^"']*["']/i.test(html)) return html;
  return __ofn_inject_head(html, '<link rel="icon" href="favicon.ico">');
}
async function __ofn_serve_asset(request) {
  // Only browser-style GETs serve static assets; everything else runs main()/email().
  if (request.method !== "GET") return null;
  if (request.headers.get("x-hostfunc-invocation-kind") === "email") return null;
  const subPath = request.headers.get("x-hostfunc-asset-path");
  const explicit = typeof subPath === "string" && subPath.length > 0;
  let assetPath;
  if (explicit) {
    assetPath = subPath.replace(/^\\/+/, "");
    if (!assetPath || assetPath.endsWith("/")) assetPath = assetPath + "index.html";
  } else {
    // Bare /run/<org>/<slug>: serve index.html when the function ships one.
    // A missing index.html still falls through to main() below.
    assetPath = "index.html";
  }
  let bytes = null;
  try {
    bytes = await assets.bytes(assetPath);
  } catch (_e) {
    bytes = null;
  }
  if (!bytes) {
    // An explicit sub-path miss is a real 404; a missing index.html falls
    // through to main() so API-only functions behave exactly as before.
    if (explicit) {
      return new Response("Not found", {
        status: 404,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "x-content-type-options": "nosniff",
        },
      });
    }
    return null;
  }
  const mime = __ofn_asset_mime(assetPath);
  const isHtml = mime.indexOf("text/html") === 0;
  const headers = { "content-type": mime, "x-content-type-options": "nosniff" };
  let body = bytes;
  if (isHtml) {
    headers["content-security-policy"] = __OFN_HTML_CSP;
    headers["cache-control"] = "no-store";
    if (!explicit) {
      const runPath = request.headers.get("x-hostfunc-run-path") || "";
      let html = __ofn_inject_base(new TextDecoder().decode(bytes), runPath);
      html = __ofn_inject_favicon(html);
      body = new TextEncoder().encode(html);
    }
  } else {
    headers["cache-control"] = "public, max-age=300, s-maxage=86400, immutable";
  }
  return new Response(body, { status: 200, headers });
}
// ------------------------------------------------------------------------

// Worker entrypoint
export default {
  async fetch(request, env, ctx) {
    __ofn_state.request = request;
    __ofn_state.env = env;
    const debug = request.headers.get("x-hostfunc-debug") === "1";
    try {
      const __ofn_asset_res = await __ofn_serve_asset(request);
      if (__ofn_asset_res) return __ofn_asset_res;
      const payload = request.method === "POST" || request.method === "PUT"
        ? await request.json().catch(() => ({}))
        : Object.fromEntries(new URL(request.url).searchParams);

      const invocationKind = request.headers.get("x-hostfunc-invocation-kind") === "email" ? "email" : "http";
      const started = Date.now();
      let result;
      if (invocationKind === "email") {
        if (typeof email !== "function") {
          return new Response(JSON.stringify({
            error: "fn_invalid",
            message: "function must export 'email' for email triggers"
          }), { status: 500, headers: { "content-type": "application/json" } });
        }
        result = await email(payload, request);
      } else {
        if (typeof main !== "function") {
          return new Response(JSON.stringify({
            error: "fn_invalid",
            message: "function must export 'main'"
          }), { status: 500, headers: { "content-type": "application/json" } });
        }
        result = await main(payload, request);
      }
      const elapsed = Date.now() - started;

      // Val Town-style: a handler may return a web Response directly. Anything
      // else is JSON-serialized exactly as before (full backward compatibility).
      if (result instanceof Response) {
        const passthrough = new Response(result.body, {
          status: result.status,
          statusText: result.statusText,
          headers: result.headers,
        });
        passthrough.headers.set("x-hostfunc-wall-ms", String(elapsed));
        // Dynamically-served HTML must run under the same sandbox as static
        // index.html assets — otherwise a handler returning text/html executes
        // as fully-trusted, same-origin script on the platform host. The CSP is
        // set (not appended) so a handler cannot downgrade the platform posture.
        if ((passthrough.headers.get("content-type") || "").indexOf("text/html") === 0) {
          passthrough.headers.set("content-security-policy", __OFN_HTML_CSP);
          passthrough.headers.set("x-content-type-options", "nosniff");
        }
        return passthrough;
      }

      return new Response(JSON.stringify(result ?? null), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "x-hostfunc-wall-ms": String(elapsed),
        },
      });
    } catch (err) {
      return __ofn_error_response(err, debug);
    } finally {
      __ofn_state.request = null;
      __ofn_state.env = null;
    }
  },
};

function __ofn_error_response(err, debug) {
  const code = (err && err.code) || null;
  const detail = (err && err.detail) || {};
  const message = err instanceof Error ? err.message : String(err);
  const stack = debug && err instanceof Error ? err.stack : undefined;
  const baseHeaders = { "content-type": "application/json" };

  if (code === "MISSING_SECRET") {
    const body = { error: "missing_secret", message, key: detail.key };
    if (detail.docsUrl) body.docsUrl = detail.docsUrl;
    if (stack) body.stack = stack;
    return new Response(JSON.stringify(body), { status: 400, headers: baseHeaders });
  }
  if (code === "FN_CALL_DEPTH") {
    const body = { error: "fn_call_depth", message };
    if (typeof detail.maxDepth === "number") body.maxDepth = detail.maxDepth;
    if (Array.isArray(detail.chain)) body.chain = detail.chain;
    if (detail.slug) body.slug = detail.slug;
    if (stack) body.stack = stack;
    return new Response(JSON.stringify(body), { status: 429, headers: baseHeaders });
  }
  if (code === "FN_CALL_TIMEOUT") {
    const body = { error: "fn_call_timeout", message };
    if (detail.slug) body.slug = detail.slug;
    if (typeof detail.timeoutMs === "number") body.timeoutMs = detail.timeoutMs;
    if (stack) body.stack = stack;
    return new Response(JSON.stringify(body), { status: 504, headers: baseHeaders });
  }
  if (code === "FN_EXECUTE_FAILED") {
    const body = { error: "fn_execute_failed", message };
    if (detail.slug) body.slug = detail.slug;
    if (typeof detail.childStatus === "number") body.childStatus = detail.childStatus;
    if (detail.childError) body.childError = detail.childError;
    if (detail.childMessage) body.childMessage = detail.childMessage;
    if (detail.childExecId) body.childExecId = detail.childExecId;
    if (stack) body.stack = stack;
    return new Response(JSON.stringify(body), { status: 502, headers: baseHeaders });
  }
  if (code === "INFRA_EXECUTE_FAILED") {
    const body = { error: "infra_unavailable", message };
    if (stack) body.stack = stack;
    return new Response(JSON.stringify(body), { status: 503, headers: baseHeaders });
  }
  const body = { error: "fn_threw", message };
  if (stack) body.stack = stack;
  return new Response(JSON.stringify(body), { status: 500, headers: baseHeaders });
}
`;

/** User code + shim ceiling. Embedded assets are budgeted separately. */
const PER_ASSET_EMBED_CAP = 512 * 1024;
const TOTAL_EMBED_BUDGET = 2 * 1024 * 1024;
/** Generous guard on the whole worker script; Cloudflare's real cap is gzipped. */
const MAX_SCRIPT_SIZE = 8_000_000;
const TEXT_ASSET_EXTS = new Set(["html", "htm", "css", "js", "mjs", "svg", "ico", "json", "txt"]);

/** Mirrors the worker shim's `__ofn_assets_module._key()` path normalization. */
function normalizeAssetKey(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
}

interface EmbedPlan {
  /** JSON object literal `{ key: base64 }`, ready to inject into the worker. */
  literal: string;
  embeddedAssetPaths: string[];
  skippedAssets: SkippedAsset[];
}

/**
 * Decides which assets are embedded into the worker bundle. Small text assets
 * (index.html, css, js, icons) are prioritised so they always fit a tight
 * budget; assets over the per-asset cap or the cumulative budget are skipped
 * and left to the KV / control-plane fallback.
 */
function planEmbeddedAssets(assets: BundleAsset[]): EmbedPlan {
  const extOf = (p: string) => (p.split(".").pop() ?? "").toLowerCase();
  const sorted = [...assets].sort((a, b) => {
    const aText = TEXT_ASSET_EXTS.has(extOf(a.path)) ? 0 : 1;
    const bText = TEXT_ASSET_EXTS.has(extOf(b.path)) ? 0 : 1;
    if (aText !== bText) return aText - bText;
    return a.content.byteLength - b.content.byteLength;
  });

  const embedded: Record<string, string> = {};
  const embeddedAssetPaths: string[] = [];
  const skippedAssets: SkippedAsset[] = [];
  let cumulative = 0;

  for (const asset of sorted) {
    const buf = asset.content instanceof Uint8Array ? asset.content : new Uint8Array(asset.content);
    const size = buf.byteLength;
    if (size > PER_ASSET_EMBED_CAP) {
      skippedAssets.push({ path: asset.path, reason: "too_large" });
      continue;
    }
    if (cumulative + size > TOTAL_EMBED_BUDGET) {
      skippedAssets.push({ path: asset.path, reason: "budget_exhausted" });
      continue;
    }
    cumulative += size;
    embedded[normalizeAssetKey(asset.path)] = Buffer.from(buf).toString("base64");
    embeddedAssetPaths.push(asset.path);
  }

  return { literal: JSON.stringify(embedded), embeddedAssetPaths, skippedAssets };
}

export async function bundleFunction(opts: BundleOptions): Promise<BundleResult> {
  const maxCodeSize = opts.maxSizeBytes ?? 1_000_000;
  const codeBytes = Buffer.byteLength(opts.code, "utf8");
  if (codeBytes > maxCodeSize) {
    throw new BundleError(`user code is ${codeBytes} bytes, exceeds ${maxCodeSize}`, []);
  }

  // Precompile a client-side entry (client.tsx/ts/jsx) into a served client.js
  // when the function ships one. The compiled output is synthetic (served, never
  // persisted) and must embed in the bundle so it loads under the sandbox CSP.
  const clientWarnings: string[] = [];
  let assets = opts.assets ?? [];
  try {
    const client = await compileClientBundle(assets);
    if (client) {
      assets = [...assets, ...client.assets];
      clientWarnings.push(...client.warnings);
    }
  } catch (e) {
    if (e instanceof Error && "errors" in e) {
      throw new BundleError(
        `client bundle failed: ${e.message}`,
        (e as { errors: Message[] }).errors,
      );
    }
    throw e;
  }

  const embed = planEmbeddedAssets(assets);
  const wrapped = ENTRY_WRAPPER(normalizeUserCode(opts.code), embed.literal);

  let result: BuildResult;
  try {
    result = await build({
      stdin: {
        contents: wrapped,
        loader: "ts",
        sourcefile: `${opts.fnId}.ts`,
      },
      bundle: true,
      write: false,
      outdir: "out",
      format: "esm",
      target: "es2022",
      platform: "neutral",
      conditions: ["worker", "browser"],
      mainFields: ["module", "main"],
      sourcemap: "external",
      treeShaking: true,
      minify: false,
      // Mark anything starting with `cloudflare:` and `node:` as external
      // so esbuild doesn't try to resolve them — Workers handles them at runtime.
      external: ["cloudflare:*", "node:*"],
      define: {
        __HOSTFUNC_FN_ID__: JSON.stringify(opts.fnId),
        __HOSTFUNC_VERSION_ID__: JSON.stringify(opts.versionId ?? ""),
      },
      logLevel: "silent",
    });
  } catch (e) {
    if (e instanceof Error && "errors" in e) {
      throw new BundleError(`bundle failed: ${e.message}`, (e as { errors: Message[] }).errors);
    }
    throw e;
  }

  const codeFile = result.outputFiles?.find((f) => f.path.endsWith(".js"));
  const sourceMapFile = result.outputFiles?.find((f) => f.path.endsWith(".js.map"));
  if (!codeFile) {
    throw new BundleError("esbuild produced no output", []);
  }

  const sizeBytes = Buffer.byteLength(codeFile.text, "utf8");
  if (sizeBytes > MAX_SCRIPT_SIZE) {
    throw new BundleError(`worker script is ${sizeBytes} bytes, exceeds ${MAX_SCRIPT_SIZE}`, []);
  }

  return {
    code: codeFile.text,
    ...(sourceMapFile?.text ? { sourceMap: sourceMapFile.text } : {}),
    sizeBytes,
    warnings: [...result.warnings.map((w) => w.text), ...clientWarnings],
    embeddedAssetPaths: embed.embeddedAssetPaths,
    skippedAssets: embed.skippedAssets,
  };
}

function normalizeUserCode(code: string): string {
  return code
    .replace(
      /^\s*import\s+[^;]*["']@hostfunc\/(?:fn|sdk(?:\/(?:ai|agent|vector))?)["'];?\s*$/gm,
      "",
    )
    .replace(/\bexport\s+default\s+async\s+function\s+main\b/g, "async function main")
    .replace(/\bexport\s+default\s+function\s+main\b/g, "function main")
    .replace(/\bexport\s+async\s+function\s+main\b/g, "async function main")
    .replace(/\bexport\s+function\s+main\b/g, "function main")
    .replace(/\bexport\s+const\s+main\b/g, "const main")
    .replace(/^\s*export\s+default\s+main\s*;?\s*$/gm, "")
    .replace(/\bexport\s+default\s+async\s+function\s+email\b/g, "async function email")
    .replace(/\bexport\s+default\s+function\s+email\b/g, "function email")
    .replace(/\bexport\s+async\s+function\s+email\b/g, "async function email")
    .replace(/\bexport\s+function\s+email\b/g, "function email")
    .replace(/\bexport\s+const\s+email\b/g, "const email")
    .replace(/^\s*export\s+default\s+email\s*;?\s*$/gm, "");
}
