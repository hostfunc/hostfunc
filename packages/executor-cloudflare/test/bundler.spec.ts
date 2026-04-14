import { afterEach, describe, expect, it, vi } from "vitest";
import { bundleFunction } from "../src/bundler.js";

describe("bundleFunction hostfunc sdk imports", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("supports default fn import for chained function calls", async () => {
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

    expect(code).toMatch(/\b(?:const|let|var)\s+fn\s*=\s*__ofn_fn;/);

    const requests: string[] = [];
    const fetchStub = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      requests.push(url);

      if (url.includes("/api/internal/secrets/get")) {
        return new Response(JSON.stringify({ found: true, value: "sk_test_123" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("/api/internal/resolve")) {
        return new Response(JSON.stringify({ fnId: "target-fn-id" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("/run/my-org/test")) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("not found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchStub);

    const mod = await import(`data:text/javascript;base64,${Buffer.from(code, "utf8").toString("base64")}`);
    const worker = mod.default as {
      fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response>;
    };

    const request = new Request("https://runtime.example/run", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hostfunc-exec-id": "exec_1",
        "x-hostfunc-fn-id": "fn_1",
        "x-hostfunc-org-id": "org_1",
        "x-hostfunc-exec-token": "exec_token",
        "x-hostfunc-control-plane": "https://control.example",
        "x-hostfunc-call-chain": "[]",
        "x-hostfunc-max-call-depth": "3",
      },
      body: JSON.stringify({ name: "jaydentest" }),
    });

    const response = await worker.fetch(request, {}, {});
    const json = (await response.json()) as { name: string; report: { ok: boolean } };

    expect(response.status).toBe(200);
    expect(json).toEqual({ name: "jaydentest", report: { ok: true } });
    expect(requests.some((url) => url.includes("/api/internal/secrets/get"))).toBe(true);
    expect(requests.some((url) => url.includes("/api/internal/resolve?slug=my-org%2Ftest"))).toBe(true);
    expect(requests.some((url) => url.includes("/run/my-org/test"))).toBe(true);
  });
});
