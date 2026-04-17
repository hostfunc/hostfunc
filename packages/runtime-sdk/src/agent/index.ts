import { getContext, requireControlPlane } from "../core/context";
import { SdkError } from "../core/types";
import type { AgentConfig, AgentResult } from "./types";

async function postAgent<T>(path: string, body: unknown): Promise<T> {
  const controlPlane = requireControlPlane();
  const token = getContext().token;
  const res = await fetch(`${controlPlane}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new SdkError(
      "AGENT_REQUEST_FAILED",
      `agent request failed (${res.status})${detail ? `: ${detail}` : ""}`,
    );
  }
  return (await res.json()) as T;
}

export async function createAgent(config: AgentConfig): Promise<AgentResult> {
  return postAgent<AgentResult>("/api/internal/agents/create", { config });
}

export async function runAgent(config: AgentConfig): Promise<AgentResult> {
  return postAgent<AgentResult>("/api/internal/agents/run", { config });
}

export type { AgentConfig, AgentResult, AgentStatus, AgentStep } from "./types";
