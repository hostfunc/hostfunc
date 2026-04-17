import { IntegrationConfigError, resolveAiConfig } from "@/server/integrations";
import { requireInternalExec } from "@/server/internal-auth";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireInternalExec(req);
  if (!auth.ok) return auth.response;
  const body = (await req.json().catch(() => null)) as { prompt?: string; model?: string } | null;

  try {
    const ai = await resolveAiConfig(auth.payload);
    const response = await fetch(new URL("/api/internal/ai/ask", req.nextUrl.origin), {
      method: "POST",
      headers: {
        authorization: req.headers.get("authorization") ?? "",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        prompt: body?.prompt ?? "Run agent",
        options: { model: body?.model ?? ai.model },
      }),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) return Response.json(json ?? { error: "agent_run_failed" }, { status: response.status });
    return Response.json({
      status: "completed",
      output: json?.text ?? "",
      model: json?.model ?? ai.model,
      provider: json?.provider ?? ai.provider,
      trace: json,
    });
  } catch (error) {
    if (error instanceof IntegrationConfigError) {
      return Response.json({ error: error.code, message: error.message, detail: error.detail }, { status: 400 });
    }
    return Response.json({ error: "agent_run_failed" }, { status: 500 });
  }
}
