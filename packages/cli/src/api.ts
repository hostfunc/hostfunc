export class CliApi {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  private async call(path: string, init?: RequestInit): Promise<unknown> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.token}`,
        ...(init?.headers ?? {}),
      },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((body as { error?: string }).error ?? `request_failed_${res.status}`);
    }
    return body;
  }

  loginCheck() {
    return this.call("/api/cli/login");
  }

  listFunctions(query?: string) {
    const suffix = query ? `?query=${encodeURIComponent(query)}` : "";
    return this.call(`/api/cli/functions${suffix}`);
  }

  deploy(fnId: string) {
    return this.call("/api/cli/functions/deploy", {
      method: "POST",
      body: JSON.stringify({ fnId }),
    });
  }

  run(fnId: string, payload: Record<string, unknown>) {
    return this.call("/api/cli/functions/run", {
      method: "POST",
      body: JSON.stringify({ fnId, payload }),
    });
  }

  logs(executionId?: string) {
    const suffix = executionId ? `?executionId=${encodeURIComponent(executionId)}` : "";
    return this.call(`/api/cli/executions/logs${suffix}`);
  }

  setSecret(fnId: string, key: string, value: string) {
    return this.call("/api/cli/secrets", {
      method: "POST",
      body: JSON.stringify({ fnId, key, value }),
    });
  }
}
