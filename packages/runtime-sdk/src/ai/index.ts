import { getContext, requireControlPlane } from "../core/context";
import { SdkError } from "../core/types";
import type { AiMessage, AiOptions, AiResponse, EmbeddingResult, StreamChunk } from "./types";

async function postJson<T>(path: string, body: unknown): Promise<T> {
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
    throw new SdkError("AI_REQUEST_FAILED", `ai request failed (${res.status})${detail ? `: ${detail}` : ""}`);
  }
  return (await res.json()) as T;
}

export async function askAi(prompt: string | AiMessage[], options?: AiOptions): Promise<AiResponse> {
  return postJson<AiResponse>("/api/internal/ai/ask", { prompt, options: options ?? {} });
}

export async function* streamAi(
  prompt: string | AiMessage[],
  options?: AiOptions,
): AsyncGenerator<StreamChunk, void, void> {
  const result = await postJson<AiResponse>("/api/internal/ai/ask", {
    prompt,
    options: options ?? {},
  });
  yield { type: "delta", text: result.text };
  yield { type: "done", done: true };
}

export async function createEmbedding(
  text: string,
  options?: Pick<AiOptions, "model">,
): Promise<EmbeddingResult> {
  return postJson<EmbeddingResult>("/api/internal/ai/embed", { text, options: options ?? {} });
}

export type { AiMessage, AiOptions, AiResponse, EmbeddingResult, StreamChunk };
