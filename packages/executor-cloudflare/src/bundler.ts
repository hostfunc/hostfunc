import { build, type BuildResult, type Message } from "esbuild";

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
const __ofn_ctx = () => {
  const req = globalThis.__ofn_req;
  if (!req) throw new Error("hostfunc: no active request");
  return {
    execId: req.headers.get("x-hostfunc-exec-id") || "",
    fnId: req.headers.get("x-hostfunc-fn-id") || "",
    orgId: req.headers.get("x-hostfunc-org-id") || "",
  };
};

const __ofn_fn_module = {
  default: {
    async executeFunction(slug, input) {
      // Real implementation arrives in Component 5 (dispatch + secrets).
      throw new Error("fn.executeFunction not yet implemented (Component 5)");
    },
  },
  secret: {
    async get(_key) { return null; },
    async getRequired(key) {
      throw new Error("secret '" + key + "' not available (Component 5)");
    },
  },
};
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
    globalThis.__ofn_req = request;
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
      globalThis.__ofn_req = undefined;
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
      sourcemap: false,
      treeShaking: true,
      minify: false,
      // Mark anything starting with `cloudflare:` and `node:` as external
      // so esbuild doesn't try to resolve them — Workers handles them at runtime.
      external: ["cloudflare:*", "node:*"],
      logLevel: "silent",
    });
  } catch (e) {
    if (e instanceof Error && "errors" in e) {
      throw new BundleError(
        `bundle failed: ${e.message}`,
        (e as { errors: Message[] }).errors,
      );
    }
    throw e;
  }

  const codeFile = result.outputFiles?.find((f) => f.path.endsWith(".js"));
  if (!codeFile) {
    throw new BundleError("esbuild produced no output", []);
  }

  const sizeBytes = Buffer.byteLength(codeFile.text, "utf8");
  if (sizeBytes > maxSize) {
    throw new BundleError(
      `bundle is ${sizeBytes} bytes, exceeds ${maxSize}`,
      [],
    );
  }

  return {
    code: codeFile.text,
    sizeBytes,
    warnings: result.warnings.map((w) => w.text),
  };
}