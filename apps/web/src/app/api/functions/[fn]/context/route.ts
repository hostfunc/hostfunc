import { requireOrgPermission } from "@/lib/session";
import {
  FnAiContextError,
  MAX_CONTEXT_ITEM_BYTES,
  createContext,
  listContextsForFunction,
} from "@/server/fn-ai-context";
import { db, schema, sql } from "@hostfunc/db";
import type { NextRequest } from "next/server";

const ALLOWED_EXTENSIONS = new Set([".md", ".mdx", ".txt", ".json", ".text", ".markdown"]);
const ALLOWED_MIME_PREFIXES = ["text/", "application/json", "application/ld+json"];

async function assertOrgOwnsFunction(orgId: string, fnId: string) {
  const rows = await db
    .select({ id: schema.fn.id })
    .from(schema.fn)
    .where(sql`${schema.fn.id} = ${fnId} and ${schema.fn.orgId} = ${orgId}`);
  if (rows.length === 0) {
    throw new Error("not_found");
  }
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

function isAllowedFile(name: string, type: string | null): boolean {
  const ext = extensionOf(name);
  if (ALLOWED_EXTENSIONS.has(ext)) return true;
  if (!type) return false;
  return ALLOWED_MIME_PREFIXES.some((prefix) => type.toLowerCase().startsWith(prefix));
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ fn: string }> },
) {
  const { fn: fnId } = await ctx.params;
  const { orgId } = await requireOrgPermission("view_workspace");
  await assertOrgOwnsFunction(orgId, fnId);
  const items = await listContextsForFunction(orgId, fnId);
  return Response.json({
    items: items.map((item) => ({
      id: item.id,
      kind: item.kind,
      name: item.name,
      sourceUri: item.sourceUri,
      mime: item.mime,
      bytes: item.bytes,
      enabled: item.enabled,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
  });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ fn: string }> },
) {
  const { fn: fnId } = await ctx.params;
  const { orgId, session } = await requireOrgPermission("edit_draft");
  try {
    await assertOrgOwnsFunction(orgId, fnId);
  } catch {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    return Response.json({ error: "multipart_required" }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "invalid_multipart" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "file_required" }, { status: 400 });
  }
  const fileName = (form.get("name") as string | null)?.trim() || file.name || "upload.txt";
  if (!isAllowedFile(file.name, file.type)) {
    return Response.json({ error: "unsupported_file_type" }, { status: 415 });
  }
  if (file.size > MAX_CONTEXT_ITEM_BYTES) {
    return Response.json({ error: "file_too_large" }, { status: 413 });
  }

  const text = await file.text();
  try {
    const created = await createContext({
      orgId,
      fnId,
      userId: session.user.id,
      kind: "file",
      name: fileName.slice(0, 200),
      content: text,
      sourceUri: file.name,
      mime: file.type || null,
    });
    return Response.json(
      {
        item: {
          id: created.id,
          kind: created.kind,
          name: created.name,
          sourceUri: created.sourceUri,
          mime: created.mime,
          bytes: created.bytes,
          enabled: created.enabled,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof FnAiContextError) {
      const status =
        error.code === "per_item_too_large" || error.code === "per_function_too_large"
          ? 413
          : error.code === "empty_content"
            ? 400
            : 500;
      return Response.json({ error: error.code }, { status });
    }
    return Response.json({ error: "upload_failed" }, { status: 500 });
  }
}
