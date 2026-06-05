import { describe, expect, it, vi } from "vitest";
import { DeviceFlowError, pollForToken, requestDeviceCode } from "./device-flow.js";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe("requestDeviceCode", () => {
  it("posts the given client_id and returns the code payload", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        device_code: "dev_1",
        user_code: "ABCD-1234",
        verification_uri: "https://hostfunc.dev/device",
        verification_uri_complete: "https://hostfunc.dev/device?user_code=ABCD-1234",
        expires_in: 600,
        interval: 5,
      }),
    ) as unknown as typeof fetch;

    const code = await requestDeviceCode({
      baseUrl: "https://hostfunc.dev/",
      clientId: "hostfunc-cli",
      fetch: fetchImpl,
    });
    expect(code.user_code).toBe("ABCD-1234");
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://hostfunc.dev/api/auth/device/code");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ client_id: "hostfunc-cli" });
  });

  it("throws on a non-ok response", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, false, 500)) as unknown as typeof fetch;
    await expect(
      requestDeviceCode({
        baseUrl: "https://hostfunc.dev",
        clientId: "hostfunc-vscode",
        fetch: fetchImpl,
      }),
    ).rejects.toBeInstanceOf(DeviceFlowError);
  });
});

describe("pollForToken", () => {
  const baseDeps = {
    baseUrl: "https://hostfunc.dev",
    clientId: "hostfunc-vscode",
    deviceCode: "dev_1",
    intervalSeconds: 1,
    expiresInSeconds: 60,
    now: () => 1000, // frozen clock < deadline
    sleep: async () => {},
  };

  it("returns the access token once approved and sends client_id", async () => {
    let call = 0;
    const fetchImpl = vi.fn(async () => {
      call += 1;
      if (call < 2) return jsonResponse({ error: "authorization_pending" }, false, 400);
      return jsonResponse({ access_token: "sess_xyz", token_type: "Bearer" });
    }) as unknown as typeof fetch;

    const token = await pollForToken({ ...baseDeps, fetch: fetchImpl });
    expect(token).toBe("sess_xyz");
    expect(call).toBe(2);
    const [, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({
      client_id: "hostfunc-vscode",
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    });
  });

  it("backs off on slow_down then succeeds", async () => {
    const sleeps: number[] = [];
    let call = 0;
    const fetchImpl = vi.fn(async () => {
      call += 1;
      if (call === 1) return jsonResponse({ error: "slow_down" }, false, 400);
      return jsonResponse({ access_token: "sess_after_slowdown" });
    }) as unknown as typeof fetch;

    const token = await pollForToken({
      ...baseDeps,
      fetch: fetchImpl,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });
    expect(token).toBe("sess_after_slowdown");
    expect(sleeps[0]).toBe(1000); // first interval
    expect(sleeps[1]).toBe(6000); // +5s after slow_down
  });

  it("throws access_denied when the user denies", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ error: "access_denied" }, false, 400),
    ) as unknown as typeof fetch;
    await expect(pollForToken({ ...baseDeps, fetch: fetchImpl })).rejects.toMatchObject({
      code: "access_denied",
    });
  });

  it("throws when the device code expires before approval", async () => {
    let t = 1000;
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ error: "authorization_pending" }, false, 400),
    ) as unknown as typeof fetch;
    const token = pollForToken({
      ...baseDeps,
      fetch: fetchImpl,
      expiresInSeconds: 2,
      now: () => {
        t += 1500; // advance past the 2s deadline after the first wait
        return t;
      },
    });
    await expect(token).rejects.toMatchObject({ code: "expired" });
  });

  it("stops polling when cancelled", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ error: "authorization_pending" }, false, 400),
    ) as unknown as typeof fetch;
    await expect(
      pollForToken({ ...baseDeps, fetch: fetchImpl, isCancelled: () => true }),
    ).rejects.toMatchObject({ code: "cancelled" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
