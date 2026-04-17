import { type BuildResult, type Message, build } from "esbuild";

export interface BundleOptions {
  /** User-authored TypeScript source. */
  code: string;
  /** Function id, used for source-map filenames. */
  fnId: string;
  /** Hard upper bound for the bundled output. */
  maxSizeBytes?: number;
}

export interface BundleResult {
  code: string;
  sourceMap?: string;
  sizeBytes: number;
  warnings: string[];
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
const __ofn_state = { request: null };

const __ofn_ctx = () => {
  const req = __ofn_state.request;
  if (!req) throw new Error("hostfunc: no active request");
  const controlPlane = req.headers.get("x-hostfunc-control-plane") || "";
  const runtimeUrl = req.headers.get("x-hostfunc-runtime-url") || controlPlane;
  return {
    execId: req.headers.get("x-hostfunc-exec-id") || "",
    fnId: req.headers.get("x-hostfunc-fn-id") || "",
    orgId: req.headers.get("x-hostfunc-org-id") || "",
    token: req.headers.get("x-hostfunc-exec-token") || "",
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

const ENTRY_WRAPPER = (userCode: string) => `
${RUNTIME_SHIM}

// Virtual module: @hostfunc/fn
const __ofn_fn = __ofn_fn_module.default;
const fn = __ofn_fn;
const secret = __ofn_fn_module.secret;

// User code begins
${userCode}
// User code ends

// Worker entrypoint
export default {
  async fetch(request, env, ctx) {
    __ofn_state.request = request;
    const debug = request.headers.get("x-hostfunc-debug") === "1";
    try {
      const payload = request.method === "POST" || request.method === "PUT"
        ? await request.json().catch(() => ({}))
        : Object.fromEntries(new URL(request.url).searchParams);

      if (typeof main !== "function") {
        return new Response(JSON.stringify({
          error: "fn_invalid",
          message: "function must export 'main'"
        }), { status: 500, headers: { "content-type": "application/json" } });
      }

      const started = Date.now();
      const result = await main(payload);
      const elapsed = Date.now() - started;

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

export async function bundleFunction(opts: BundleOptions): Promise<BundleResult> {
  const maxSize = opts.maxSizeBytes ?? 1_000_000;
  const wrapped = ENTRY_WRAPPER(normalizeUserCode(opts.code));

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
  if (sizeBytes > maxSize) {
    throw new BundleError(`bundle is ${sizeBytes} bytes, exceeds ${maxSize}`, []);
  }

  return {
    code: codeFile.text,
    ...(sourceMapFile?.text ? { sourceMap: sourceMapFile.text } : {}),
    sizeBytes,
    warnings: result.warnings.map((w) => w.text),
  };
}

function normalizeUserCode(code: string): string {
  return code
    .replace(/^\s*import\s+[^;]*["']@hostfunc\/fn["'];?\s*$/gm, "")
    .replace(/\bexport\s+default\s+async\s+function\s+main\b/g, "async function main")
    .replace(/\bexport\s+default\s+function\s+main\b/g, "function main")
    .replace(/\bexport\s+async\s+function\s+main\b/g, "async function main")
    .replace(/\bexport\s+function\s+main\b/g, "function main")
    .replace(/\bexport\s+const\s+main\b/g, "const main")
    .replace(/^\s*export\s+default\s+main\s*;?\s*$/gm, "");
}
