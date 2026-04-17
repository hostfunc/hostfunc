import { IntegrationConfigError, resolveAiConfig } from "@/server/integrations";
import { requireInternalExec } from "@/server/internal-auth";
import { genId } from "@hostfunc/db";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireInternalExec(req);
  if (!auth.ok) return auth.response;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  try {
    const ai = await resolveAiConfig(auth.payload);
    return Response.json({
      id: genId("tok"),
      status: "created",
      provider: ai.provider,
      model: ai.model,
      config: body ?? {},
    });
  } catch (error) {
    if (error instanceof IntegrationConfigError) {
      return Response.json({ error: error.code, message: error.message, detail: error.detail }, { status: 400 });
    }
    return Response.json({ error: "agent_create_failed" }, { status: 500 });
  }
}
