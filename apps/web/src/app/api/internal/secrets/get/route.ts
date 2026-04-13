import { decryptSecret } from "@/lib/crypto";
import { authenticateCallback } from "@/server/exec-registry";
import { db, schema } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return Response.json({ error: "missing_token" }, { status: 401 });

  const verified = await authenticateCallback(token);
  if (!verified) return Response.json({ error: "invalid_token" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { key?: string } | null;
  if (!body?.key) return Response.json({ error: "missing_key" }, { status: 400 });

  const rows = await db
    .select({ ciphertext: schema.secret.ciphertext })
    .from(schema.secret)
    .where(
      and(
        eq(schema.secret.fnId, verified.payload.fnId),
        eq(schema.secret.orgId, verified.payload.orgId),
        eq(schema.secret.key, body.key),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return Response.json({ found: false }, { status: 404 });

  try {
    return Response.json({ found: true, value: decryptSecret(row.ciphertext) });
  } catch (error) {
    console.error("[secrets/get] decrypt failed", error);
    return Response.json({ error: "decrypt_failed" }, { status: 500 });
  }
}
