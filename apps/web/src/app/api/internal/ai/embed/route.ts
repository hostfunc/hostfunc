import { IntegrationConfigError, resolveAiConfig } from "@/server/integrations";
import { requireInternalExec } from "@/server/internal-auth";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireInternalExec(req);
  if (!auth.ok) return auth.response;
  const body = (await req.json().catch(() => null)) as
    | { input?: string; text?: string; options?: { model?: string } }
    | null;
  const input = body?.input ?? body?.text;
  if (!input) return Response.json({ error: "invalid_body" }, { status: 400 });

  try {
    const ai = await resolveAiConfig(auth.payload);
    const model = body?.options?.model ?? "text-embedding-3-small";
    if (ai.provider !== "openai") {
      return Response.json(
        { error: "invalid_integration_config", message: "Embeddings currently require OpenAI provider" },
        { status: 400 },
      );
    }
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        authorization: `Bearer ${ai.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ model, input }),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) return Response.json({ error: "provider_error", detail: json }, { status: 502 });
    return Response.json({ embedding: json?.data?.[0]?.embedding ?? [], raw: json, provider: ai.provider, model });
  } catch (error) {
    if (error instanceof IntegrationConfigError) {
      return Response.json({ error: error.code, message: error.message, detail: error.detail }, { status: 400 });
    }
    return Response.json({ error: "ai_embed_failed" }, { status: 500 });
  }
}
