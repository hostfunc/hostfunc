import { afterEach, describe, expect, it, vi } from "vitest";
import { bundleFunction } from "../src/bundler.js";

interface WorkerModule {
  default: {
    fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response>;
  };
}

const CONTROL_PLANE = "https://control.example";
const RUNTIME_URL = "https://runtime.example";

async function invokeWorker(code: string, body: unknown = {}): Promise<Response> {
  const mod = (await import(
    `data:text/javascript;base64,${Buffer.from(code, "utf8").toString("base64")}`
  )) as WorkerModule;
  const request = new Request(`${RUNTIME_URL}/run/my-org/kv-fn`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-hostfunc-exec-id": "exec_1",
      "x-hostfunc-fn-id": "fn_1",
      "x-hostfunc-org-id": "org_1",
      "x-hostfunc-exec-token": "exec_token",
      "x-hostfunc-control-plane": CONTROL_PLANE,
      "x-hostfunc-runtime-url": RUNTIME_URL,
      "x-hostfunc-call-chain": "[]",
      "x-hostfunc-max-call-depth": "3",
    },
    body: JSON.stringify(body),
  });
  return mod.default.fetch(request, {}, {});
}

describe("kv shim", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("strips the @hostfunc/sdk/kv import and routes all kv calls through the control plane", async () => {
    const source = `
      import { kv } from "@hostfunc/sdk/kv";
      export async function main() {
        await kv.set("greeting", { hello: "world" }, { ttlSeconds: 60 });
        const greeting = await kv.get("greeting");
        const count = await kv.incr("counter", 2);
        const many = await kv.getMany(["greeting", "missing"]);
        const page = await kv.list({ prefix: "gre", limit: 10 });
        const deleted = await kv.delete("greeting");
        return { greeting, count, many, page, deleted };
      }
    `;
    const { code } = await bundleFunction({ code: source, fnId: "fn_kv_test" });
    expect(code).toContain("__ofn_kv_module");
    // The import line must be stripped — the sdk package is not resolvable here.
    expect(code).not.toContain("@hostfunc/sdk/kv");

    const requests: Array<{ url: string; body: Record<string, unknown>; auth: string | null }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        const headers = new Headers(init?.headers);
        requests.push({
          url,
          body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>,
          auth: headers.get("authorization"),
        });
        const respond = (payload: unknown) =>
          new Response(JSON.stringify(payload), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        if (url === `${CONTROL_PLANE}/api/internal/kv/set`) return respond({ ok: true });
        if (url === `${CONTROL_PLANE}/api/internal/kv/get`) {
          return respond({ found: true, value: { hello: "world" } });
        }
        if (url === `${CONTROL_PLANE}/api/internal/kv/incr`) return respond({ value: 2 });
        if (url === `${CONTROL_PLANE}/api/internal/kv/get-many`) {
          return respond({ values: { greeting: { hello: "world" } } });
        }
        if (url === `${CONTROL_PLANE}/api/internal/kv/list`) {
          return respond({ keys: ["greeting"], cursor: null });
        }
        if (url === `${CONTROL_PLANE}/api/internal/kv/delete`) return respond({ deleted: true });
        return new Response("not found", { status: 404 });
      }),
    );

    const response = await invokeWorker(code);
    expect(response.status).toBe(200);
    const json = (await response.json()) as Record<string, unknown>;
    expect(json).toEqual({
      greeting: { hello: "world" },
      count: 2,
      many: { greeting: { hello: "world" }, missing: null },
      page: { keys: ["greeting"], cursor: null },
      deleted: true,
    });

    // Every kv call must carry the exec token and hit the control plane.
    expect(requests).toHaveLength(6);
    for (const request of requests) {
      expect(request.url.startsWith(`${CONTROL_PLANE}/api/internal/kv/`)).toBe(true);
      expect(request.auth).toBe("Bearer exec_token");
    }
    const set = requests.find((r) => r.url.endsWith("/kv/set"));
    expect(set?.body).toEqual({ key: "greeting", value: { hello: "world" }, ttlSeconds: 60 });
    const incr = requests.find((r) => r.url.endsWith("/kv/incr"));
    expect(incr?.body).toEqual({ key: "counter", delta: 2 });
    const list = requests.find((r) => r.url.endsWith("/kv/list"));
    expect(list?.body).toEqual({ prefix: "gre", limit: 10 });
  });

  it("defaults incr delta to 1", async () => {
    const source = `
      import { kv } from "@hostfunc/sdk/kv";
      export async function main() {
        return { count: await kv.incr("hits") };
      }
    `;
    const { code } = await bundleFunction({ code: source, fnId: "fn_kv_incr" });

    let incrBody: Record<string, unknown> | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url.endsWith("/api/internal/kv/incr")) {
          incrBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
          return new Response(JSON.stringify({ value: 1 }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response("not found", { status: 404 });
      }),
    );

    const response = await invokeWorker(code);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ count: 1 });
    expect(incrBody).toEqual({ key: "hits", delta: 1 });
  });
});

describe("npm driver imports", () => {
  it("bundles user code importing @neondatabase/serverless", async () => {
    const source = `
      import { neon } from "@neondatabase/serverless";
      export async function main() {
        return { driver: typeof neon };
      }
    `;
    const { code, sizeBytes } = await bundleFunction({
      code: source,
      fnId: "fn_neon_test",
      resolveDir: new URL("..", import.meta.url).pathname,
    });
    expect(sizeBytes).toBeGreaterThan(0);
    expect(code).toContain("neon");
  });

  it("bundles user code importing @upstash/redis", async () => {
    const source = `
      import { Redis } from "@upstash/redis";
      export async function main() {
        return { driver: typeof Redis };
      }
    `;
    const { sizeBytes } = await bundleFunction({
      code: source,
      fnId: "fn_upstash_test",
      resolveDir: new URL("..", import.meta.url).pathname,
    });
    expect(sizeBytes).toBeGreaterThan(0);
  });
});
