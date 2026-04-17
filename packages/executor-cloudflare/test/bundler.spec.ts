import { afterEach, describe, expect, it, vi } from "vitest";
import { bundleFunction } from "../src/bundler.js";

interface WorkerModule {
  default: {
    fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response>;
  };
}

const CONTROL_PLANE = "https://control.example";
const RUNTIME_URL = "https://runtime.example";

interface InvokeOptions {
  code: string;
  /** Optional override of x-hostfunc-control-plane. */
  controlPlane?: string;
  /** Optional override of x-hostfunc-runtime-url. Pass null to omit it. */
  runtimeUrl?: string | null;
  callChain?: Array<{ fnId: string; execId: string }>;
  maxCallDepth?: number;
  debug?: boolean;
  body?: unknown;
}

async function invokeWorker({
  code,
  controlPlane = CONTROL_PLANE,
  runtimeUrl = RUNTIME_URL,
  callChain = [],
  maxCallDepth = 3,
  debug = false,
  body = {},
}: InvokeOptions): Promise<Response> {
  const mod = (await import(
    `data:text/javascript;base64,${Buffer.from(code, "utf8").toString("base64")}`
  )) as WorkerModule;
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-hostfunc-exec-id": "exec_1",
    "x-hostfunc-fn-id": "fn_1",
    "x-hostfunc-org-id": "org_1",
    "x-hostfunc-exec-token": "exec_token",
    "x-hostfunc-control-plane": controlPlane,
    "x-hostfunc-call-chain": JSON.stringify(callChain),
    "x-hostfunc-max-call-depth": String(maxCallDepth),
  };
  if (runtimeUrl !== null) headers["x-hostfunc-runtime-url"] = runtimeUrl;
  if (debug) headers["x-hostfunc-debug"] = "1";
  const request = new Request(`${RUNTIME_URL}/run/my-org/caller`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return mod.default.fetch(request, {}, {});
}

describe("bundleFunction shim routing", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("routes executeFunction through the runtime URL and secrets through the control plane", async () => {
    const source = `
      import fn, { secret } from "@hostfunc/fn";
      export async function main(input: { name?: string }) {
        const name = input.name ?? "jayden";
        const key = await secret.getRequired("CLAUDE_API_KEY");
        const report = await fn.executeFunction("my-org/test", { key });
        return { name, report };
      }
    `;
    const { code } = await bundleFunction({ code: source, fnId: "fn_test_bundle" });

    const requests: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;
        requests.push({ url, init });

        if (url.startsWith(`${CONTROL_PLANE}/api/internal/secrets/get`)) {
          return new Response(JSON.stringify({ found: true, value: "sk_test_123" }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        if (url.startsWith(`${CONTROL_PLANE}/api/internal/resolve`)) {
          return new Response(JSON.stringify({ fnId: "target-fn-id" }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        if (url === `${RUNTIME_URL}/run/my-org/test`) {
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response("not found", { status: 404 });
      }),
    );

    const response = await invokeWorker({ code, body: { name: "jaydentest" } });
    const json = (await response.json()) as { name: string; report: { ok: boolean } };
    expect(response.status).toBe(200);
    expect(json).toEqual({ name: "jaydentest", report: { ok: true } });

    // The runtime origin and the control-plane origin are distinct — which is
    // exactly the production topology. executeFunction must NOT call the
    // control plane for /run/... (that used to return 404 and break chaining).
    const executeCalls = requests.filter((r) => r.url.includes("/run/my-org/test"));
    expect(executeCalls).toHaveLength(1);
    expect(executeCalls[0]?.url.startsWith(RUNTIME_URL)).toBe(true);

    expect(
      requests.some((r) => r.url.startsWith(`${CONTROL_PLANE}/api/internal/secrets/get`)),
    ).toBe(true);
    expect(
      requests.some((r) => r.url.includes("/api/internal/resolve?slug=my-org%2Ftest")),
    ).toBe(true);
  });

  it("returns HTTP 400 missing_secret when a required secret is absent (no stack leak)", async () => {
    const source = `
      import { secret } from "@hostfunc/fn";
      export async function main() {
        return await secret.getRequired("CLAUDE_API_KEY");
      }
    `;
    const { code } = await bundleFunction({ code: source, fnId: "fn_missing_secret" });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url.includes("/api/internal/secrets/get")) {
          return new Response(JSON.stringify({ found: false }), {
            status: 404,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response("not found", { status: 404 });
      }),
    );

    const response = await invokeWorker({ code });
    expect(response.status).toBe(400);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.error).toBe("missing_secret");
    expect(body.key).toBe("CLAUDE_API_KEY");
    expect(body.docsUrl).toBe(`${CONTROL_PLANE}/dashboard/fn_1/settings/secrets`);
    expect(body.stack).toBeUndefined();
  });

  it("surfaces child fn 404 as HTTP 502 fn_execute_failed with childStatus", async () => {
    const source = `
      import fn from "@hostfunc/fn";
      export async function main() {
        return await fn.executeFunction("my-org/missing", { hello: "world" });
      }
    `;
    const { code } = await bundleFunction({ code: source, fnId: "fn_child_404" });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url.includes("/api/internal/resolve")) {
          return new Response(JSON.stringify({ fnId: null }), { status: 200 });
        }
        if (url.startsWith(`${RUNTIME_URL}/run/my-org/missing`)) {
          return new Response(JSON.stringify({ error: "fn_not_found" }), {
            status: 404,
            headers: { "content-type": "application/json", "x-hostfunc-exec-id": "exec_child_1" },
          });
        }
        return new Response("?", { status: 500 });
      }),
    );

    const response = await invokeWorker({ code });
    expect(response.status).toBe(502);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.error).toBe("fn_execute_failed");
    expect(body.slug).toBe("my-org/missing");
    expect(body.childStatus).toBe(404);
    expect(body.childError).toBe("fn_not_found");
    expect(body.childExecId).toBe("exec_child_1");
  });

  it("returns HTTP 429 fn_call_depth when chain is already at max", async () => {
    const source = `
      import fn from "@hostfunc/fn";
      export async function main() {
        return await fn.executeFunction("my-org/anything", {});
      }
    `;
    const { code } = await bundleFunction({ code: source, fnId: "fn_depth" });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 200 })),
    );

    const response = await invokeWorker({
      code,
      maxCallDepth: 3,
      callChain: [
        { fnId: "fn_a", execId: "exec_a" },
        { fnId: "fn_b", execId: "exec_b" },
        { fnId: "fn_c", execId: "exec_c" },
      ],
    });
    expect(response.status).toBe(429);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.error).toBe("fn_call_depth");
    expect(body.maxDepth).toBe(3);
  });

  it("returns HTTP 504 fn_call_timeout when executeFunction times out", async () => {
    const source = `
      import fn from "@hostfunc/fn";
      export async function main() {
        return await fn.executeFunction("my-org/slow", {}, { timeoutMs: 20 });
      }
    `;
    const { code } = await bundleFunction({ code: source, fnId: "fn_timeout" });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: unknown, init?: RequestInit) => {
        const url =
          typeof _input === "string"
            ? _input
            : _input instanceof URL
              ? _input.toString()
              : (_input as Request).url;
        if (url.includes("/api/internal/resolve")) {
          return new Response(JSON.stringify({ fnId: null }), { status: 200 });
        }
        // Respect AbortSignal so AbortSignal.timeout() actually fires.
        return await new Promise<Response>((resolve, reject) => {
          const signal = init?.signal as AbortSignal | undefined;
          const timer = setTimeout(
            () => resolve(new Response("{}", { status: 200 })),
            1000,
          );
          signal?.addEventListener("abort", () => {
            clearTimeout(timer);
            const err = new Error("aborted");
            err.name = "TimeoutError";
            reject(err);
          });
        });
      }),
    );

    const response = await invokeWorker({ code });
    expect(response.status).toBe(504);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.error).toBe("fn_call_timeout");
    expect(body.slug).toBe("my-org/slow");
    expect(body.timeoutMs).toBe(20);
  });

  it("omits stack traces by default and includes them when x-hostfunc-debug=1", async () => {
    const source = `
      export async function main() {
        throw new Error("boom");
      }
    `;
    const { code } = await bundleFunction({ code: source, fnId: "fn_stack" });

    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200 })));

    const responseProd = await invokeWorker({ code });
    expect(responseProd.status).toBe(500);
    const bodyProd = (await responseProd.json()) as Record<string, unknown>;
    expect(bodyProd.error).toBe("fn_threw");
    expect(bodyProd.message).toBe("boom");
    expect(bodyProd.stack).toBeUndefined();

    const responseDebug = await invokeWorker({ code, debug: true });
    expect(responseDebug.status).toBe(500);
    const bodyDebug = (await responseDebug.json()) as Record<string, unknown>;
    expect(bodyDebug.error).toBe("fn_threw");
    expect(typeof bodyDebug.stack).toBe("string");
    expect((bodyDebug.stack as string).length).toBeGreaterThan(0);
  });

  it("falls back to controlPlane URL when x-hostfunc-runtime-url header is absent (legacy workers)", async () => {
    const source = `
      import fn from "@hostfunc/fn";
      export async function main() {
        return await fn.executeFunction("my-org/test", {});
      }
    `;
    const { code } = await bundleFunction({ code: source, fnId: "fn_legacy" });

    const seenUrls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        seenUrls.push(url);
        if (url.includes("/api/internal/resolve")) {
          return new Response(JSON.stringify({ fnId: null }), { status: 200 });
        }
        if (url.includes("/run/my-org/test")) {
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response("?", { status: 500 });
      }),
    );

    const response = await invokeWorker({ code, runtimeUrl: null });
    expect(response.status).toBe(200);
    const runCall = seenUrls.find((u) => u.includes("/run/my-org/test"));
    expect(runCall).toBeDefined();
    // With no runtime URL header, fall back to control plane for backwards compat.
    expect(runCall?.startsWith(CONTROL_PLANE)).toBe(true);
  });
});
