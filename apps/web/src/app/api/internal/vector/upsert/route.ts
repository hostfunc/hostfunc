import { IntegrationConfigError, resolveVectorConfig } from "@/server/integrations";
import { requireInternalExec } from "@/server/internal-auth";
import { vectorUpsert } from "@/server/vector-backends";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireInternalExec(req);
  if (!auth.ok) return auth.response;
  const body = (await req.json().catch(() => null)) as
    | { namespace?: string; vectors?: Array<{ id: string; values: number[]; metadata?: Record<string, unknown> }> }
    | null;
  if (!body?.namespace || !Array.isArray(body.vectors)) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  try {
    const config = await resolveVectorConfig(auth.payload);
    const result = await vectorUpsert(config, body.namespace, body.vectors);
    return Response.json({
      namespace: body.namespace,
      upserted: Number(result.upsertedCount ?? body.vectors.length),
      backend: result.backend,
    });
  } catch (error) {
    if (error instanceof IntegrationConfigError) {
      return Response.json({ error: error.code, message: error.message, detail: error.detail }, { status: 400 });
    }
    return Response.json({ error: "vector_upsert_failed", detail: error instanceof Error ? error.message : "unknown" }, { status: 502 });
  }
}
