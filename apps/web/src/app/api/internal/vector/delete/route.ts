import { IntegrationConfigError, resolveVectorConfig } from "@/server/integrations";
import { requireInternalExec } from "@/server/internal-auth";
import { vectorDelete } from "@/server/vector-backends";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireInternalExec(req);
  if (!auth.ok) return auth.response;
  const body = (await req.json().catch(() => null)) as { namespace?: string; ids?: string[] } | null;
  if (!body?.namespace || !Array.isArray(body.ids)) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  try {
    const config = await resolveVectorConfig(auth.payload);
    const result = await vectorDelete(config, body.namespace, body.ids);
    return Response.json({
      namespace: body.namespace,
      deleted: Number(result.deletedCount ?? body.ids.length),
      backend: result.backend,
    });
  } catch (error) {
    if (error instanceof IntegrationConfigError) {
      return Response.json({ error: error.code, message: error.message, detail: error.detail }, { status: 400 });
    }
    return Response.json({ error: "vector_delete_failed", detail: error instanceof Error ? error.message : "unknown" }, { status: 502 });
  }
}
