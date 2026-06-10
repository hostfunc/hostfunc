/**
 * RFC 8628 device-authorization flow against the hostfunc control plane (better-auth
 * `device-authorization` plugin, mounted under `/api/auth/device/*`). Dependency-free (global
 * `fetch`) so it runs unchanged in the VS Code extension host and the Node CLI, and is unit-testable
 * with an injected `fetch`/clock.
 *
 * `clientId` must be allow-listed by the server's `validateClient` (see `apps/web/src/lib/auth.ts`):
 * `hostfunc-vscode` for the extension, `hostfunc-cli` for the CLI.
 */

const GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code";

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}

export interface DeviceFlowDeps {
  baseUrl: string;
  clientId: string;
  fetch?: typeof fetch;
  /** Injectable clock for tests; defaults to `Date.now`. */
  now?: () => number;
  /** Injectable delay for tests; defaults to a real timer. */
  sleep?: (ms: number) => Promise<void>;
}

export type DeviceFlowErrorCode =
  | "access_denied"
  | "expired_token"
  | "expired"
  | "cancelled"
  | "request_failed";

export class DeviceFlowError extends Error {
  constructor(
    message: string,
    readonly code: DeviceFlowErrorCode,
  ) {
    super(message);
    this.name = "DeviceFlowError";
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

/** Step 1 — request a device + user code pair to display to the user. */
export async function requestDeviceCode(deps: DeviceFlowDeps): Promise<DeviceCodeResponse> {
  const fetchImpl = deps.fetch ?? fetch;
  const res = await fetchImpl(`${normalizeBaseUrl(deps.baseUrl)}/api/auth/device/code`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_id: deps.clientId }),
  });
  if (!res.ok) {
    throw new DeviceFlowError(`device_code_request_failed_${res.status}`, "request_failed");
  }
  return (await res.json()) as DeviceCodeResponse;
}

export interface PollOptions extends DeviceFlowDeps {
  deviceCode: string;
  intervalSeconds: number;
  expiresInSeconds: number;
  /** Aborts the poll loop early (e.g. user cancels the progress notification). */
  isCancelled?: () => boolean;
}

/**
 * Step 2 — poll the token endpoint until the user approves (returns the session access token),
 * denies, or the code expires. Honours `authorization_pending` and `slow_down` per the RFC.
 */
export async function pollForToken(options: PollOptions): Promise<string> {
  const fetchImpl = options.fetch ?? fetch;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

  const deadline = now() + options.expiresInSeconds * 1000;
  let intervalMs = options.intervalSeconds * 1000;

  while (now() < deadline) {
    if (options.isCancelled?.()) {
      throw new DeviceFlowError("sign_in_cancelled", "cancelled");
    }
    await sleep(intervalMs);

    const res = await fetchImpl(`${normalizeBaseUrl(options.baseUrl)}/api/auth/device/token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        grant_type: GRANT_TYPE,
        device_code: options.deviceCode,
        client_id: options.clientId,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      error?: string;
    };

    if (res.ok && body.access_token) {
      return body.access_token;
    }

    switch (body.error) {
      case "authorization_pending":
        break;
      case "slow_down":
        intervalMs += 5000;
        break;
      case "access_denied":
        throw new DeviceFlowError("access_denied", "access_denied");
      case "expired_token":
        throw new DeviceFlowError("device_code_expired", "expired_token");
      default:
        if (!res.ok && res.status >= 500) break; // transient — keep polling
        if (body.error) throw new DeviceFlowError(body.error, "request_failed");
    }
  }

  throw new DeviceFlowError("device_code_expired", "expired");
}
