import { describe, expect, it, vi } from "vitest";
import { DraftConflictError, HostfuncApiClient, HostfuncApiError } from "./client.js";

const TOKEN = "hfn_live_TESTONLYxxxxxxxxxxxxxxxxxxxxxxxx";

function mockFetch(responses: Array<{ ok?: boolean; status?: number; body: unknown }>) {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  let i = 0;
  const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const r = responses[Math.min(i, responses.length - 1)];
    i += 1;
    calls.push({ url: String(url), init });
    return {
      ok: r?.ok ?? true,
      status: r?.status ?? 200,
      headers: { get: () => "application/json" },
      json: async () => r?.body ?? {},
    } as unknown as Response;
  });
  return { fetchImpl: fetchImpl as unknown as typeof fetch, calls };
}

describe("HostfuncApiClient", () => {
  it("sends the bearer token and base url, strips trailing slashes", async () => {
    const { fetchImpl, calls } = mockFetch([{ body: { ok: true, items: [] } }]);
    const client = new HostfuncApiClient({
      baseUrl: "https://hostfunc.dev/",
      getToken: () => TOKEN,
      fetch: fetchImpl,
    });
    await client.listFunctions();
    expect(calls[0]?.url).toBe("https://hostfunc.dev/api/cli/functions");
    const headers = calls[0]?.init?.headers as Record<string, string>;
    expect(headers.authorization).toBe(`Bearer ${TOKEN}`);
    expect(headers["content-type"]).toBe("application/json");
  });

  it("awaits an async token provider", async () => {
    const { fetchImpl, calls } = mockFetch([{ body: { ok: true, actor: {}, membership: null } }]);
    const client = new HostfuncApiClient({
      baseUrl: "https://hostfunc.dev",
      getToken: async () => TOKEN,
      fetch: fetchImpl,
    });
    await client.loginCheck();
    const headers = calls[0]?.init?.headers as Record<string, string>;
    expect(headers.authorization).toBe(`Bearer ${TOKEN}`);
  });

  it("throws not_authenticated (401) when no token is available", async () => {
    const { fetchImpl } = mockFetch([{ body: {} }]);
    const client = new HostfuncApiClient({
      baseUrl: "https://hostfunc.dev",
      getToken: () => null,
      fetch: fetchImpl,
    });
    await expect(client.listFunctions()).rejects.toMatchObject({ status: 401 });
  });

  it("surfaces the server error message and status on non-ok", async () => {
    const { fetchImpl } = mockFetch([{ ok: false, status: 404, body: { error: "not_found" } }]);
    const client = new HostfuncApiClient({
      baseUrl: "https://hostfunc.dev",
      getToken: () => TOKEN,
      fetch: fetchImpl,
    });
    await expect(client.deploy("fn_missing")).rejects.toThrow(HostfuncApiError);
    await expect(client.deploy("fn_missing")).rejects.toMatchObject({
      message: "not_found",
      status: 404,
    });
  });

  it("encodes the list query and posts run payloads", async () => {
    const { fetchImpl, calls } = mockFetch([
      { body: { ok: true, items: [] } },
      { body: { ok: true, status: 200, executionId: "exec_1", result: {} } },
    ]);
    const client = new HostfuncApiClient({
      baseUrl: "https://hostfunc.dev",
      getToken: () => TOKEN,
      fetch: fetchImpl,
    });
    await client.listFunctions("hello world");
    expect(calls[0]?.url).toBe("https://hostfunc.dev/api/cli/functions?query=hello%20world");

    await client.run("fn_1", { name: "x" }, "cron");
    expect(calls[1]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[1]?.init?.body as string)).toEqual({
      fnId: "fn_1",
      payload: { name: "x" },
      triggerKind: "cron",
    });
  });

  it("pushDraft sends fnId/code/baseSha256 and returns the new sha", async () => {
    const { fetchImpl, calls } = mockFetch([{ body: { ok: true, sha256: "abc123" } }]);
    const client = new HostfuncApiClient({
      baseUrl: "https://hostfunc.dev",
      getToken: () => TOKEN,
      fetch: fetchImpl,
    });
    const result = await client.pushDraft({ fnId: "fn_1", code: "x", baseSha256: "old" });
    expect(result.sha256).toBe("abc123");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      fnId: "fn_1",
      code: "x",
      baseSha256: "old",
    });
  });

  it("pushDraft throws DraftConflictError carrying the server code on 409", async () => {
    const { fetchImpl } = mockFetch([
      {
        ok: false,
        status: 409,
        body: { error: "conflict", serverCode: "newer", serverSha256: "s2" },
      },
    ]);
    const client = new HostfuncApiClient({
      baseUrl: "https://hostfunc.dev",
      getToken: () => TOKEN,
      fetch: fetchImpl,
    });
    await expect(client.pushDraft({ fnId: "fn_1", code: "x" })).rejects.toBeInstanceOf(
      DraftConflictError,
    );
    const err = await client.pushDraft({ fnId: "fn_1", code: "x" }).catch((e) => e);
    expect(err).toMatchObject({ serverCode: "newer", serverSha256: "s2", status: 409 });
  });

  it("createFunction posts the slug and returns the new fnId", async () => {
    const { fetchImpl, calls } = mockFetch([
      { ok: true, status: 201, body: { ok: true, fnId: "fn_new", slug: "hello" } },
    ]);
    const client = new HostfuncApiClient({
      baseUrl: "https://hostfunc.dev",
      getToken: () => TOKEN,
      fetch: fetchImpl,
    });
    const result = await client.createFunction({ slug: "hello" });
    expect(result.fnId).toBe("fn_new");
    expect(calls[0]?.url).toBe("https://hostfunc.dev/api/cli/functions");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({ slug: "hello" });
  });

  it("exchanges a device session using the session token, not the PAT", async () => {
    const { fetchImpl, calls } = mockFetch([
      {
        body: {
          ok: true,
          token: TOKEN,
          orgId: "org_1",
          orgSlug: "acme",
          orgName: "Acme",
          userId: "u1",
        },
      },
    ]);
    const client = new HostfuncApiClient({
      baseUrl: "https://hostfunc.dev",
      getToken: () => null,
      fetch: fetchImpl,
    });
    const result = await client.exchangeDeviceSession("sess_abc", {
      orgId: "org_1",
      deviceName: "macbook",
    });
    expect(result.orgSlug).toBe("acme");
    const headers = calls[0]?.init?.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer sess_abc");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      orgId: "org_1",
      deviceName: "macbook",
    });
  });
});
