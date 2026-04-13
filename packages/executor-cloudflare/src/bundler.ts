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
  return {
    execId: req.headers.get("x-hostfunc-exec-id") || "",
    fnId: req.headers.get("x-hostfunc-fn-id") || "",
    orgId: req.headers.get("x-hostfunc-org-id") || "",
    token: req.headers.get("x-hostfunc-exec-token") || "",
    controlPlane: req.headers.get("x-hostfunc-control-plane") || "",
    callChain: JSON.parse(req.headers.get("x-hostfunc-call-chain") || "[]"),
    maxCallDepth: Number(req.headers.get("x-hostfunc-max-call-depth") || "3"),
  };
};

class HostfuncError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "HostfuncError";
    this.code = code;
  }
}

const __ofn_fn_module = {
  default: {
    async executeFunction(slug, input) {
      const ctx = __ofn_ctx();
      const nextChain = [...ctx.callChain, { fnId: ctx.fnId, execId: ctx.execId }];
      if (nextChain.length > ctx.maxCallDepth) {
        throw new HostfuncError("FN_CALL_DEPTH", "max call depth " + ctx.maxCallDepth + " exceeded");
      }

      const targetFnId = await __ofn_resolve_slug(ctx, slug);
      if (targetFnId && nextChain.some((f) => f.fnId === targetFnId)) {
        throw new HostfuncError("FN_CALL_DEPTH", "loop detected for " + slug);
      }

      const slash = slug.indexOf("/");
      if (slash < 1) {
        throw new HostfuncError("FN_NOT_FOUND", "executeFunction slug must be 'owner/slug'");
      }
      const owner = slug.slice(0, slash);
      const fnSlug = slug.slice(slash + 1);
      const res = await fetch(ctx.controlPlane + "/run/" + owner + "/" + fnSlug, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-hostfunc-call-chain": JSON.stringify(nextChain),
          "x-hostfunc-parent-exec": ctx.execId,
        },
        body: JSON.stringify(input ?? {}),
      });
      if (!res.ok) {
        throw new HostfuncError("FN_THREW", "executeFunction failed with " + res.status);
      }
      return await res.json();
    },
  },
  secret: {
    async get(key) {
      const ctx = __ofn_ctx();
      if (!ctx.controlPlane || !ctx.token) {
        throw new HostfuncError("INFRA_EXECUTE_FAILED", "missing control-plane headers");
      }
      const res = await fetch(ctx.controlPlane + "/api/internal/secrets/get", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer " + ctx.token,
        },
        body: JSON.stringify({ key }),
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new HostfuncError("INFRA_EXECUTE_FAILED", "secret fetch failed");
      const json = await res.json();
      return json.found ? json.value : null;
    },
    async getRequired(key) {
      const v = await this.get(key);
      if (v == null) throw new HostfuncError("FN_THREW", "missing required secret: " + key);
      return v;
    },
  },
};

async function __ofn_resolve_slug(ctx, slug) {
  try {
    const url = ctx.controlPlane + "/api/internal/resolve?slug=" + encodeURIComponent(slug);
    const res = await fetch(url, { headers: { authorization: "Bearer " + ctx.token } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.fnId || null;
  } catch {
    return null;
  }
}
`;

const ENTRY_WRAPPER = (userCode: string) => `
${RUNTIME_SHIM}

// Virtual module: @hostfunc/fn
const __ofn_fn = __ofn_fn_module.default;
const secret = __ofn_fn_module.secret;

// User code begins
${userCode}
// User code ends

// Worker entrypoint
export default {
  async fetch(request, env, ctx) {
    __ofn_state.request = request;
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
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      return new Response(JSON.stringify({
        error: "fn_threw",
        message,
        stack,
      }), { status: 500, headers: { "content-type": "application/json" } });
    } finally {
      __ofn_state.request = null;
    }
  },
};
`;

export async function bundleFunction(opts: BundleOptions): Promise<BundleResult> {
  const maxSize = opts.maxSizeBytes ?? 1_000_000;
  const wrapped = ENTRY_WRAPPER(opts.code);

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
