import { getContext } from "./context";
import { SdkError } from "./types";

export interface SecretApi {
  get(key: string): Promise<string | null>;
  getRequired(key: string): Promise<string>;
}

export const secret: SecretApi = {
  async get(key: string): Promise<string | null> {
    const ctx = getContext();
    if (ctx.isEnvFallback && !ctx.token) {
      throw new SdkError(
        "INFRA_EXECUTE_FAILED",
        "HOSTFUNC_API_KEY is required for npm SDK usage. Create one in dashboard settings > tokens.",
      );
    }
    if (!ctx.controlPlane || !ctx.token) {
      throw new SdkError(
        "INFRA_EXECUTE_FAILED",
        "secret service unavailable: missing control-plane headers",
      );
    }
    let res: Response;
    try {
      res = await fetch(`${ctx.controlPlane}/api/internal/secrets/get`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${ctx.token}`,
        },
        body: JSON.stringify({
          key,
          ...(ctx.fnId ? { fnId: ctx.fnId } : {}),
        }),
        signal: AbortSignal.timeout(10000),
      });
    } catch (error) {
      throw new SdkError(
        "INFRA_EXECUTE_FAILED",
        `secret service network error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (res.status === 404) return null;
    if (res.status === 401 || res.status === 403) {
      throw new SdkError("INFRA_EXECUTE_FAILED", `secret service unauthorized (${res.status})`);
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new SdkError(
        "INFRA_EXECUTE_FAILED",
        `secret fetch failed (${res.status})${detail ? `: ${detail}` : ""}`,
      );
    }
    const json = (await res.json().catch(() => null)) as { found?: boolean; value?: string } | null;
    if (!json?.found) return null;
    return json.value ?? null;
  },

  async getRequired(key: string): Promise<string> {
    const value = await this.get(key);
    if (value == null) {
      const ctx = getContext();
      const docsUrl = ctx.controlPlane
        ? `${ctx.controlPlane}/dashboard/${ctx.fnId}/settings/secrets`
        : null;
      throw new SdkError("MISSING_SECRET", `missing required secret: ${key}`, { key, docsUrl });
    }
    return value;
  },
};
