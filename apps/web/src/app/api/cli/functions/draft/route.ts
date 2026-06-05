import { createHash } from "node:crypto";
import { requireCliActor } from "@/server/cli-auth";
import { getCurrentVersionCodeForFunction } from "@/server/functions";
import { db, schema } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

function sha256(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * Returns the code to seed a local checkout (`pull`): the caller's draft if present, else the
 * deployed version's code. The returned `sha256` is the merge base the client records in
 * `hostfunc.json` and sends back as `baseSha256` on `push`.
 */
export async function GET(req: NextRequest) {
  const actor = await requireCliActor(req.headers.get("authorization"));
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });

  const fnId = req.nextUrl.searchParams.get("fnId");
  if (!fnId) return Response.json({ error: "invalid_body" }, { status: 400 });

  const fnRows = await db
    .select({ id: schema.fn.id })
    .from(schema.fn)
    .where(and(eq(schema.fn.id, fnId), eq(schema.fn.orgId, actor.orgId)))
    .limit(1);
  if (!fnRows[0]) return Response.json({ error: "not_found" }, { status: 404 });

  const draftRows = await db
    .select({ code: schema.fnDraft.code })
    .from(schema.fnDraft)
    .where(and(eq(schema.fnDraft.fnId, fnId), eq(schema.fnDraft.userId, actor.userId)))
    .limit(1);

  let code = draftRows[0]?.code ?? null;
  let source: "draft" | "version" | "empty" = code !== null ? "draft" : "empty";
  if (code === null) {
    const versionCode = await getCurrentVersionCodeForFunction(actor.orgId, fnId);
    if (versionCode !== null) {
      code = versionCode;
      source = "version";
    }
  }

  const resolved = code ?? "";
  return Response.json({ ok: true, code: resolved, sha256: sha256(resolved), source });
}

/**
 * Sets the per-user draft code for a function (the local-first `push`). Deploy reads this draft, so
 * pushing then deploying ships local edits.
 *
 * Optimistic concurrency: the client sends `baseSha256` (the sha it last pulled). If the current
 * server draft differs, we return `409` with the server code so the client can show a diff and
 * re-push with `force: true`.
 */
export async function POST(req: NextRequest) {
  const actor = await requireCliActor(req.headers.get("authorization"));
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    fnId?: string;
    code?: string;
    baseSha256?: string;
    force?: boolean;
  } | null;
  if (!body?.fnId || typeof body.code !== "string") {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const fnRows = await db
    .select({ id: schema.fn.id })
    .from(schema.fn)
    .where(and(eq(schema.fn.id, body.fnId), eq(schema.fn.orgId, actor.orgId)))
    .limit(1);
  if (!fnRows[0]) return Response.json({ error: "not_found" }, { status: 404 });

  const existing = await db
    .select({ code: schema.fnDraft.code })
    .from(schema.fnDraft)
    .where(and(eq(schema.fnDraft.fnId, body.fnId), eq(schema.fnDraft.userId, actor.userId)))
    .limit(1);
  const serverCode = existing[0]?.code ?? null;

  if (!body.force && serverCode !== null) {
    const serverSha = sha256(serverCode);
    // Conflict when the client's merge base no longer matches the server draft.
    if (body.baseSha256 !== undefined && body.baseSha256 !== serverSha) {
      return Response.json(
        { error: "conflict", serverCode, serverSha256: serverSha },
        { status: 409 },
      );
    }
  }

  await db
    .insert(schema.fnDraft)
    .values({ fnId: body.fnId, userId: actor.userId, code: body.code })
    .onConflictDoUpdate({
      target: [schema.fnDraft.fnId, schema.fnDraft.userId],
      set: { code: body.code, updatedAt: new Date() },
    });

  return Response.json({ ok: true, sha256: sha256(body.code) });
}
