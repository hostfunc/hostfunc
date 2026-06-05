import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CloudflareApiCallError } from "../src/api.js";
import { CloudflareCustomHostnames } from "../src/custom-hostnames.js";

const CFG = { apiToken: "token-123", zoneId: "zone-abc" };

function envelope(result: unknown, ok = true) {
  return {
    ok,
    status: ok ? 200 : 400,
    json: async () => ({
      success: ok,
      errors: ok ? [] : [{ code: 1001, message: "bad" }],
      messages: [],
      result,
    }),
    text: async () => JSON.stringify(result),
  } as unknown as Response;
}

const RAW_PENDING = {
  id: "ch_1",
  hostname: "www.example.com",
  status: "pending",
  ssl: {
    status: "pending_validation",
    validation_records: [
      { txt_name: "_acme.www.example.com", txt_value: "abc123" },
      { cname: "www.example.com", cname_target: "cname.hostfunc.app" },
    ],
  },
  ownership_verification: {
    type: "txt",
    name: "_cf-custom-hostname.www.example.com",
    value: "verify-token",
  },
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("CloudflareCustomHostnames.create", () => {
  it("POSTs to the zone collection with TXT DCV and maps the response", async () => {
    fetchMock.mockResolvedValueOnce(envelope(RAW_PENDING));
    const client = new CloudflareCustomHostnames(CFG);

    const rec = await client.create("www.example.com");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.cloudflare.com/client/v4/zones/zone-abc/custom_hostnames");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer token-123");
    const body = JSON.parse(init.body as string);
    expect(body.hostname).toBe("www.example.com");
    expect(body.ssl).toMatchObject({ method: "txt", type: "dv" });

    expect(rec.id).toBe("ch_1");
    expect(rec.status).toBe("pending");
    expect(rec.ssl.status).toBe("pending_validation");
    expect(rec.ssl.validationRecords).toEqual([
      { kind: "txt", name: "_acme.www.example.com", value: "abc123" },
      { kind: "cname", name: "www.example.com", value: "cname.hostfunc.app" },
    ]);
    expect(rec.ownershipVerification).toEqual({
      kind: "txt",
      name: "_cf-custom-hostname.www.example.com",
      value: "verify-token",
    });
  });

  it("throws CloudflareApiCallError on a failed envelope", async () => {
    fetchMock.mockResolvedValueOnce(envelope(null, false));
    const client = new CloudflareCustomHostnames(CFG);
    await expect(client.create("bad.example.com")).rejects.toBeInstanceOf(CloudflareApiCallError);
  });
});

describe("CloudflareCustomHostnames.get", () => {
  it("GETs the record url and maps active state with no ownership record", async () => {
    fetchMock.mockResolvedValueOnce(
      envelope({
        id: "ch_1",
        hostname: "www.example.com",
        status: "active",
        ssl: { status: "active", validation_records: [] },
      }),
    );
    const client = new CloudflareCustomHostnames(CFG);

    const rec = await client.get("ch_1");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.cloudflare.com/client/v4/zones/zone-abc/custom_hostnames/ch_1");
    expect(init.method).toBe("GET");
    expect(rec.status).toBe("active");
    expect(rec.ssl.status).toBe("active");
    expect(rec.ssl.validationRecords).toEqual([]);
    expect(rec.ownershipVerification).toBeNull();
  });
});

describe("CloudflareCustomHostnames.delete", () => {
  it("treats 404 as success", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => "not found",
    } as unknown as Response);
    const client = new CloudflareCustomHostnames(CFG);
    await expect(client.delete("ch_missing")).resolves.toBeUndefined();
  });

  it("throws on a non-404 error", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "boom",
    } as unknown as Response);
    const client = new CloudflareCustomHostnames(CFG);
    await expect(client.delete("ch_1")).rejects.toBeInstanceOf(CloudflareApiCallError);
  });
});
