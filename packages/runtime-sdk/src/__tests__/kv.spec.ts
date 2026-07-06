import { afterEach, describe, expect, it, vi } from "vitest";
import { SdkError } from "../core/types";
import { kv } from "../kv";

const CONTROL_PLANE = "https://cp.local";

function stubContext() {
  vi.stubGlobal("__hostfunc_context", { controlPlane: CONTROL_PLANE, token: "tok" });
}

function stubFetch(handler: (url: string, body: Record<string, unknown>) => unknown) {
  const calls: Array<{ url: string; body: Record<string, unknown>; auth: string | null }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      calls.push({ url, body, auth: new Headers(init?.headers).get("authorization") });
      return Response.json(handler(url, body));
    }),
  );
  return calls;
}

describe("@hostfunc/sdk/kv", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("get returns the value when found and null when missing", async () => {
    stubContext();
    stubFetch((_url, body) =>
      body.key === "present" ? { found: true, value: { a: 1 } } : { found: false, value: null },
    );
    expect(await kv.get("present")).toEqual({ a: 1 });
    expect(await kv.get("absent")).toBeNull();
  });

  it("set posts key, value, and optional ttl with the exec token", async () => {
    stubContext();
    const calls = stubFetch(() => ({ ok: true }));
    await kv.set("k", [1, 2], { ttlSeconds: 30 });
    await kv.set("k2", "v");
    expect(calls[0]).toMatchObject({
      url: `${CONTROL_PLANE}/api/internal/kv/set`,
      body: { key: "k", value: [1, 2], ttlSeconds: 30 },
      auth: "Bearer tok",
    });
    // No ttlSeconds key at all when the option is omitted.
    expect(calls[1]?.body).toEqual({ key: "k2", value: "v" });
  });

  it("incr defaults delta to 1 and returns the new value", async () => {
    stubContext();
    const calls = stubFetch(() => ({ value: 7 }));
    expect(await kv.incr("hits")).toBe(7);
    expect(calls[0]?.body).toEqual({ key: "hits", delta: 1 });
    await kv.incr("hits", -2);
    expect(calls[1]?.body).toEqual({ key: "hits", delta: -2 });
  });

  it("delete returns whether a key was removed", async () => {
    stubContext();
    stubFetch(() => ({ deleted: false }));
    expect(await kv.delete("k")).toBe(false);
  });

  it("getMany maps missing keys to null in key order", async () => {
    stubContext();
    stubFetch(() => ({ values: { b: 2 } }));
    expect(await kv.getMany(["a", "b"])).toEqual({ a: null, b: 2 });
  });

  it("list forwards prefix/limit/cursor and normalizes the result", async () => {
    stubContext();
    const calls = stubFetch((_url, body) =>
      body.prefix ? { keys: ["item:a"], cursor: "item:a" } : { keys: [] },
    );
    const page = await kv.list({ prefix: "item:", limit: 1 });
    expect(calls[0]?.body).toEqual({ prefix: "item:", limit: 1 });
    expect(page).toEqual({ keys: ["item:a"], cursor: "item:a" });
    // A response with no cursor field normalizes to null.
    const empty = await kv.list();
    expect(calls[1]?.body).toEqual({});
    expect(empty).toEqual({ keys: [], cursor: null });
  });

  it("wraps non-2xx responses in a KV_REQUEST_FAILED SdkError", async () => {
    stubContext();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("kv_quota_exceeded", { status: 409 })),
    );
    await expect(kv.set("k", 1)).rejects.toMatchObject({ code: "KV_REQUEST_FAILED" });
    await expect(kv.get("k")).rejects.toBeInstanceOf(SdkError);
  });

  it("fails fast without a control plane in context", async () => {
    await expect(kv.get("k")).rejects.toMatchObject({ code: "INFRA_EXECUTE_FAILED" });
  });
});
