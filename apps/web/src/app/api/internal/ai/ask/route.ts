import { IntegrationConfigError, resolveAiConfig } from "@/server/integrations";
import { requireInternalExec } from "@/server/internal-auth";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
const CLAUDE_MODEL_FALLBACKS = [
  "claude-3-5-sonnet-latest",
  "claude-3-5-haiku-latest",
  "claude-3-haiku-20240307",
] as const;

export async function POST(req: NextRequest) {
  const auth = await requireInternalExec(req);
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as
    | { prompt?: string; messages?: Array<{ role: string; content: string }>; options?: { model?: string } }
    | null;
  if (!body?.prompt && !body?.messages?.length) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const ai = await resolveAiConfig(auth.payload);
    const model = body.options?.model ?? ai.model;
    if (ai.provider === "openai") {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${ai.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages:
            body.messages ??
            [
              {
                role: "user",
                content: body.prompt ?? "",
              },
            ],
        }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) return Response.json({ error: "provider_error", detail: json }, { status: 502 });
      const text = json?.choices?.[0]?.message?.content ?? "";
      return Response.json({ text, raw: json, provider: ai.provider, model });
    }

    const sourceMessages =
      body.messages?.length
        ? body.messages
        : [{ role: "user", content: body.prompt ?? "" }];
    const systemParts = sourceMessages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .filter(Boolean);
    const anthropicMessages = sourceMessages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }));

    const candidateModels = [model, ...CLAUDE_MODEL_FALLBACKS.filter((m) => m !== model)];
    let lastStatus = 502;
    let lastDetail: unknown = null;
    let usedModel = model;
    for (const modelName of candidateModels) {
      usedModel = modelName;
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ai.apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: modelName,
          max_tokens: 1024,
          ...(systemParts.length > 0 ? { system: systemParts.join("\n\n") } : {}),
          messages: anthropicMessages.length > 0 ? anthropicMessages : [{ role: "user", content: body.prompt ?? "" }],
        }),
      });
      const json = await response.json().catch(() => null);
      if (response.ok) {
        const text = json?.content?.[0]?.text ?? "";
        return Response.json({ text, raw: json, provider: ai.provider, model: usedModel });
      }
      lastStatus = response.status;
      lastDetail = json;
      const raw = JSON.stringify(json);
      const modelNotFound =
        response.status === 404 ||
        raw.includes("not_found_error") ||
        raw.includes('"model:');
      if (!modelNotFound) break;
    }
    return Response.json({ error: "provider_error", detail: lastDetail }, { status: lastStatus === 400 ? 400 : 502 });
  } catch (error) {
    if (error instanceof IntegrationConfigError) {
      return Response.json({ error: error.code, message: error.message, detail: error.detail }, { status: 400 });
    }
    return Response.json({ error: "ai_ask_failed" }, { status: 500 });
  }
}
