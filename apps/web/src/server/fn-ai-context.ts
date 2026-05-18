import "server-only";

import { db, genId, schema } from "@hostfunc/db";
import { and, desc, eq, inArray } from "drizzle-orm";

export type FnAiContextKind = "note" | "url" | "file";

export interface FnAiContextRecord {
  id: string;
  fnId: string;
  orgId: string;
  kind: FnAiContextKind;
  name: string;
  content: string;
  sourceUri: string | null;
  mime: string | null;
  bytes: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Per-item hard cap on attached doc size, in bytes. */
export const MAX_CONTEXT_ITEM_BYTES = 100_000;
/** Per-function hard cap across all attached docs, in bytes. */
export const MAX_CONTEXT_TOTAL_BYTES = 500_000;
/** Per-request generation budget for attached doc bytes merged into the prompt. */
export const MAX_CONTEXT_PROMPT_BUDGET_BYTES = 60_000;

export class FnAiContextError extends Error {
  constructor(
    public readonly code:
      | "per_item_too_large"
      | "per_function_too_large"
      | "empty_content"
      | "url_fetch_failed"
      | "not_found"
      | "invalid_url",
    message: string,
  ) {
    super(message);
    this.name = "FnAiContextError";
  }
}

function toRecord(row: typeof schema.fnAiContext.$inferSelect): FnAiContextRecord {
  return {
    id: row.id,
    fnId: row.fnId,
    orgId: row.orgId,
    kind: row.kind as FnAiContextKind,
    name: row.name,
    content: row.content,
    sourceUri: row.sourceUri,
    mime: row.mime,
    bytes: row.bytes,
    enabled: row.enabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function byteLength(text: string): number {
  return Buffer.byteLength(text, "utf8");
}

async function getTotalBytesForFunction(orgId: string, fnId: string): Promise<number> {
  const rows = await db
    .select({ bytes: schema.fnAiContext.bytes })
    .from(schema.fnAiContext)
    .where(and(eq(schema.fnAiContext.orgId, orgId), eq(schema.fnAiContext.fnId, fnId)));
  let total = 0;
  for (const row of rows) total += row.bytes ?? 0;
  return total;
}

function assertPerItemFits(content: string): void {
  const size = byteLength(content);
  if (size === 0) {
    throw new FnAiContextError("empty_content", "Attached doc content is empty");
  }
  if (size > MAX_CONTEXT_ITEM_BYTES) {
    throw new FnAiContextError(
      "per_item_too_large",
      `Attached doc exceeds ${MAX_CONTEXT_ITEM_BYTES} bytes (got ${size})`,
    );
  }
}

async function assertTotalFits(
  orgId: string,
  fnId: string,
  addBytes: number,
  excludeId?: string,
): Promise<void> {
  let used = await getTotalBytesForFunction(orgId, fnId);
  if (excludeId) {
    const rows = await db
      .select({ bytes: schema.fnAiContext.bytes })
      .from(schema.fnAiContext)
      .where(eq(schema.fnAiContext.id, excludeId));
    for (const row of rows) used -= row.bytes ?? 0;
  }
  if (used + addBytes > MAX_CONTEXT_TOTAL_BYTES) {
    throw new FnAiContextError(
      "per_function_too_large",
      `Function attached-doc storage would exceed ${MAX_CONTEXT_TOTAL_BYTES} bytes`,
    );
  }
}

export async function listContextsForFunction(
  orgId: string,
  fnId: string,
): Promise<FnAiContextRecord[]> {
  const rows = await db
    .select()
    .from(schema.fnAiContext)
    .where(and(eq(schema.fnAiContext.orgId, orgId), eq(schema.fnAiContext.fnId, fnId)))
    .orderBy(desc(schema.fnAiContext.updatedAt));
  return rows.map(toRecord);
}

export async function getEnabledContextsByIds(
  orgId: string,
  fnId: string,
  ids: string[],
): Promise<FnAiContextRecord[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select()
    .from(schema.fnAiContext)
    .where(
      and(
        eq(schema.fnAiContext.orgId, orgId),
        eq(schema.fnAiContext.fnId, fnId),
        eq(schema.fnAiContext.enabled, true),
        inArray(schema.fnAiContext.id, ids),
      ),
    );
  return rows.map(toRecord);
}

export async function getContextById(id: string): Promise<FnAiContextRecord | null> {
  const rows = await db.select().from(schema.fnAiContext).where(eq(schema.fnAiContext.id, id));
  const row = rows[0];
  return row ? toRecord(row) : null;
}

export interface CreateContextInput {
  orgId: string;
  fnId: string;
  userId: string;
  kind: FnAiContextKind;
  name: string;
  content: string;
  sourceUri?: string | null;
  mime?: string | null;
  enabled?: boolean;
}

export async function createContext(input: CreateContextInput): Promise<FnAiContextRecord> {
  assertPerItemFits(input.content);
  const size = byteLength(input.content);
  await assertTotalFits(input.orgId, input.fnId, size);

  const id = genId("fdc");
  await db.insert(schema.fnAiContext).values({
    id,
    orgId: input.orgId,
    fnId: input.fnId,
    createdById: input.userId,
    kind: input.kind,
    name: input.name.slice(0, 200),
    content: input.content,
    sourceUri: input.sourceUri ?? null,
    mime: input.mime ?? null,
    bytes: size,
    enabled: input.enabled ?? true,
  });
  const created = await getContextById(id);
  if (!created) throw new FnAiContextError("not_found", "failed to load created context");
  return created;
}

export interface UpdateContextInput {
  orgId: string;
  fnId: string;
  id: string;
  name?: string;
  content?: string;
  enabled?: boolean;
  sourceUri?: string | null;
}

export async function updateContext(input: UpdateContextInput): Promise<FnAiContextRecord> {
  const existing = await getContextById(input.id);
  if (!existing || existing.orgId !== input.orgId || existing.fnId !== input.fnId) {
    throw new FnAiContextError("not_found", "context not found");
  }

  const patch: Partial<typeof schema.fnAiContext.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (typeof input.name === "string") patch.name = input.name.slice(0, 200);
  if (typeof input.enabled === "boolean") patch.enabled = input.enabled;
  if (input.sourceUri !== undefined) patch.sourceUri = input.sourceUri;
  if (typeof input.content === "string") {
    assertPerItemFits(input.content);
    const size = byteLength(input.content);
    await assertTotalFits(input.orgId, input.fnId, size, input.id);
    patch.content = input.content;
    patch.bytes = size;
  }

  await db.update(schema.fnAiContext).set(patch).where(eq(schema.fnAiContext.id, input.id));
  const updated = await getContextById(input.id);
  if (!updated) throw new FnAiContextError("not_found", "context vanished after update");
  return updated;
}

export async function deleteContext(orgId: string, fnId: string, id: string): Promise<void> {
  await db
    .delete(schema.fnAiContext)
    .where(
      and(
        eq(schema.fnAiContext.id, id),
        eq(schema.fnAiContext.orgId, orgId),
        eq(schema.fnAiContext.fnId, fnId),
      ),
    );
}

export async function toggleContextEnabled(
  orgId: string,
  fnId: string,
  id: string,
  enabled: boolean,
): Promise<FnAiContextRecord> {
  return updateContext({ orgId, fnId, id, enabled });
}

function sanitizeHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function isValidPublicUrl(input: string): URL | null {
  try {
    const url = new URL(input);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "0.0.0.0" ||
      host.endsWith(".localhost") ||
      host.startsWith("127.") ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      host.startsWith("169.254.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

/** Fetches a URL and returns sanitized text, bounded by the per-item cap. */
export async function fetchUrlAsContext(rawUrl: string): Promise<{
  content: string;
  mime: string | null;
  sourceUri: string;
}> {
  const url = isValidPublicUrl(rawUrl);
  if (!url) throw new FnAiContextError("invalid_url", "invalid or private url");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { "user-agent": "hostfunc-ai-context/1.0" },
    });
    if (!res.ok) {
      throw new FnAiContextError("url_fetch_failed", `fetch failed: ${res.status}`);
    }
    const mime = res.headers.get("content-type")?.split(";")[0]?.trim() ?? null;
    const raw = await res.text();
    const text = mime?.startsWith("text/html")
      ? sanitizeHtml(raw)
      : raw.replace(/\s+\n/g, "\n").trim();
    if (!text) {
      throw new FnAiContextError("url_fetch_failed", "empty response body");
    }
    const truncated = text.slice(0, MAX_CONTEXT_ITEM_BYTES);
    return { content: truncated, mime, sourceUri: url.toString() };
  } catch (error) {
    if (error instanceof FnAiContextError) throw error;
    throw new FnAiContextError("url_fetch_failed", "fetch failed");
  } finally {
    clearTimeout(timeout);
  }
}

export async function refreshUrlContext(
  orgId: string,
  fnId: string,
  id: string,
): Promise<FnAiContextRecord> {
  const existing = await getContextById(id);
  if (!existing || existing.orgId !== orgId || existing.fnId !== fnId) {
    throw new FnAiContextError("not_found", "context not found");
  }
  if (existing.kind !== "url" || !existing.sourceUri) {
    throw new FnAiContextError("invalid_url", "context has no url to refresh");
  }
  const fetched = await fetchUrlAsContext(existing.sourceUri);
  return updateContext({
    orgId,
    fnId,
    id,
    content: fetched.content,
    sourceUri: fetched.sourceUri,
  });
}
