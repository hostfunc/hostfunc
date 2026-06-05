import type {
  CreateFunctionInput,
  CreateFunctionResult,
  DeployResult,
  DeviceExchangeResult,
  DraftResult,
  ListFunctionsResult,
  ListOrgsResult,
  LoginCheckResult,
  LogsResult,
  PushDraftResult,
  RunResult,
  TriggerKind,
} from "./types.js";

/** Thrown when a control-plane request returns a non-2xx response. */
export class HostfuncApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "HostfuncApiError";
  }
}

/** Thrown by `pushDraft` when the server draft has moved on (HTTP 409). Carries the server code. */
export class DraftConflictError extends HostfuncApiError {
  constructor(
    readonly serverCode: string,
    readonly serverSha256: string,
  ) {
    super("conflict", 409, { error: "conflict", serverCode, serverSha256 });
    this.name = "DraftConflictError";
  }
}

/** Resolves the bearer token to use for `/api/cli/*` calls. May be async (e.g. SecretStorage). */
export type TokenProvider = () => string | null | undefined | Promise<string | null | undefined>;

export interface HostfuncApiClientOptions {
  baseUrl: string;
  /** Personal access token (`hfn_live_…`) provider. Required for every method except the device flow. */
  getToken: TokenProvider;
  /** Override for testing; defaults to the global `fetch`. */
  fetch?: typeof fetch;
}

/**
 * Typed client for the hostfunc control-plane CLI surface. Shared by `@hostfunc/cli` and the
 * VS Code extension so the request/response contract lives in exactly one place.
 */
export class HostfuncApiClient {
  private readonly baseUrl: string;
  private readonly getToken: TokenProvider;
  private readonly fetchImpl: typeof fetch;

  constructor(options: HostfuncApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.getToken = options.getToken;
    this.fetchImpl = options.fetch ?? fetch;
  }

  private async call<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await this.getToken();
    if (!token) throw new HostfuncApiError("not_authenticated", 401);
    return this.request<T>(path, token, init);
  }

  private async request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      throw new HostfuncApiError(body.error ?? `request_failed_${res.status}`, res.status, body);
    }
    return body as T;
  }

  loginCheck(): Promise<LoginCheckResult> {
    return this.call<LoginCheckResult>("/api/cli/login");
  }

  listFunctions(query?: string): Promise<ListFunctionsResult> {
    const suffix = query ? `?query=${encodeURIComponent(query)}` : "";
    return this.call<ListFunctionsResult>(`/api/cli/functions${suffix}`);
  }

  listOrgs(): Promise<ListOrgsResult> {
    return this.call<ListOrgsResult>("/api/cli/orgs");
  }

  /** Mints a fresh PAT scoped to another org the user belongs to (org switching). */
  createOrgToken(orgId: string, deviceName?: string): Promise<DeviceExchangeResult> {
    return this.call<DeviceExchangeResult>("/api/cli/orgs", {
      method: "POST",
      body: JSON.stringify({ orgId, ...(deviceName ? { deviceName } : {}) }),
    });
  }

  deploy(fnId: string): Promise<DeployResult> {
    return this.call<DeployResult>("/api/cli/functions/deploy", {
      method: "POST",
      body: JSON.stringify({ fnId }),
    });
  }

  run(
    fnId: string,
    payload: Record<string, unknown>,
    triggerKind?: TriggerKind,
  ): Promise<RunResult> {
    return this.call<RunResult>("/api/cli/functions/run", {
      method: "POST",
      body: JSON.stringify({ fnId, payload, ...(triggerKind ? { triggerKind } : {}) }),
    });
  }

  logs(executionId?: string): Promise<LogsResult> {
    const suffix = executionId ? `?executionId=${encodeURIComponent(executionId)}` : "";
    return this.call<LogsResult>(`/api/cli/executions/logs${suffix}`);
  }

  setSecret(fnId: string, key: string, value: string): Promise<{ ok: true }> {
    return this.call<{ ok: true }>("/api/cli/secrets", {
      method: "POST",
      body: JSON.stringify({ fnId, key, value }),
    });
  }

  /** Creates a function in the active org (local-first `init`). */
  createFunction(input: CreateFunctionInput): Promise<CreateFunctionResult> {
    return this.call<CreateFunctionResult>("/api/cli/functions", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  /** Fetches the code to seed a local checkout (`pull`), with its merge-base sha256. */
  getDraft(fnId: string): Promise<DraftResult> {
    return this.call<DraftResult>(`/api/cli/functions/draft?fnId=${encodeURIComponent(fnId)}`);
  }

  /**
   * Writes local code to the server draft (`push`). Pass `baseSha256` (from the last pull/push) for
   * optimistic concurrency: a conflicting server draft throws {@link DraftConflictError} unless
   * `force` is set.
   */
  async pushDraft(input: {
    fnId: string;
    code: string;
    baseSha256?: string;
    force?: boolean;
  }): Promise<PushDraftResult> {
    try {
      return await this.call<PushDraftResult>("/api/cli/functions/draft", {
        method: "POST",
        body: JSON.stringify(input),
      });
    } catch (error) {
      if (error instanceof HostfuncApiError && error.status === 409) {
        const body = error.body as { serverCode?: string; serverSha256?: string } | undefined;
        throw new DraftConflictError(body?.serverCode ?? "", body?.serverSha256 ?? "");
      }
      throw error;
    }
  }

  /**
   * Exchange an approved better-auth session for an org-scoped `hfn_live_` PAT. Authenticated with
   * the session token (not a PAT), so this bypasses `getToken`. Used by the device-flow sign-in.
   */
  exchangeDeviceSession(
    sessionToken: string,
    options?: { orgId?: string; deviceName?: string },
  ): Promise<DeviceExchangeResult> {
    return this.request<DeviceExchangeResult>("/api/cli/device/exchange", sessionToken, {
      method: "POST",
      body: JSON.stringify({
        ...(options?.orgId ? { orgId: options.orgId } : {}),
        ...(options?.deviceName ? { deviceName: options.deviceName } : {}),
      }),
    });
  }
}
