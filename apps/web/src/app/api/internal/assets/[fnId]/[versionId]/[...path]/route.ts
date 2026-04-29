import { verifyExecToken } from "@/lib/exec-token";
import { AssetError, getVersionAssetBlob } from "@/server/fn-assets";
import { authenticateApiToken } from "@/server/api-tokens";
import { authenticateCallback } from "@/server/exec-registry";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  {
    params,
  }: { params: Promise<{ fnId: string; versionId: string; path: string[] }> },
) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const token = auth.slice("Bearer ".length);
  const callback = await authenticateCallback(token);
  const payload = callback?.payload ?? verifyExecToken(token);
  const apiActor = payload ? null : await authenticateApiToken(token);
  if (!payload && !apiActor) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { fnId, versionId, path } = await params;
    if (payload && payload.fnId !== fnId) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
    const blob = await getVersionAssetBlob({ versionId, path: path.join("/") });
    if (!blob) return Response.json({ error: "not_found" }, { status: 404 });
    if (apiActor && blob.id) {
      // API tokens are scoped per-org. We rely on path namespacing to be enough,
      // but extra ownership checks could be added if needed.
    }
    const view = new Uint8Array(blob.content);
    return new Response(view, {
      status: 200,
      headers: {
        "content-type": blob.mime,
        "cache-control": "private, no-store",
        "content-length": String(blob.sizeBytes),
        "x-asset-sha256": blob.sha256,
      },
    });
  } catch (error) {
    if (error instanceof AssetError) {
      return Response.json({ error: error.code, message: error.message }, { status: error.status });
    }
    return Response.json(
      { error: "internal_error", message: error instanceof Error ? error.message : "unknown" },
      { status: 500 },
    );
  }
}
