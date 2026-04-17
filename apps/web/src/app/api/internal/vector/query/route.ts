import { IntegrationConfigError, resolveVectorConfig } from "@/server/integrations";
import { requireInternalExec } from "@/server/internal-auth";
import { vectorQuery } from "@/server/vector-backends";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireInternalExec(req);
  if (!auth.ok) return auth.response;
  const body = (await req.json().catch(() => null)) as
    | { namespace?: string; embedding?: number[]; topK?: number; includeValues?: boolean }
    | null;
  if (!body?.namespace || !Array.isArray(body.embedding)) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  try {
    const config = await resolveVectorConfig(auth.payload);
    const result = await vectorQuery(config, {
      namespace: body.namespace,
      vector: body.embedding,
      ...(typeof body.topK === "number" ? { topK: body.topK } : {}),
    });
    return Response.json({
      namespace: body.namespace,
      matches: (result.matches ?? []).map((match: Record<string, unknown>) => ({
        id: match.id,
        score: match.score,
        metadata: match.metadata,
        ...(body.includeValues ? { values: match.values } : {}),
      })),
      backend: result.backend,
    });
  } catch (error) {
    if (error instanceof IntegrationConfigError) {
      return Response.json({ error: error.code, message: error.message, detail: error.detail }, { status: 400 });
    }
    return Response.json({ error: "vector_query_failed", detail: error instanceof Error ? error.message : "unknown" }, { status: 502 });
  }
}
