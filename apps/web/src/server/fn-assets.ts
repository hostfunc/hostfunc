import "server-only";

import { createHash } from "node:crypto";
import { db, genId, schema, sql } from "@hostfunc/db";
import {
  ASSET_MAX_FILES_PER_FN,
  ASSET_MAX_FILE_BYTES,
  ASSET_MAX_TOTAL_BYTES,
  AssetError,
  type AssetKind,
  RESERVED_PATHS,
  classifyAsset,
  sanitizeAssetPath,
} from "./fn-asset-paths";

export {
  ASSET_MAX_FILE_BYTES,
  ASSET_MAX_FILES_PER_FN,
  ASSET_MAX_TOTAL_BYTES,
  AssetError,
  RESERVED_PATHS,
  classifyAsset,
  sanitizeAssetPath,
};
export type { AssetKind };

function compat<T>(value: T): T {
  return value;
}

export interface AssetSummary {
  id: string;
  path: string;
  kind: AssetKind;
  mime: string;
  sizeBytes: number;
  sha256: string;
  updatedAt: Date;
}

export interface AssetBlob extends AssetSummary {
  content: Buffer;
}

function hashContent(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

async function loadFnRow(fnId: string) {
  const rows = await db
    .select({ id: schema.fn.id, orgId: schema.fn.orgId, visibility: schema.fn.visibility })
    .from(schema.fn)
    .where(compat(sql`${schema.fn.id} = ${fnId}`) as never)
    .limit(1);
  return rows[0] ?? null;
}

export async function listFunctionAssets(fnId: string): Promise<AssetSummary[]> {
  const rows = await db
    .select({
      id: schema.fnAsset.id,
      path: schema.fnAsset.path,
      kind: schema.fnAsset.kind,
      mime: schema.fnAsset.mime,
      sizeBytes: schema.fnAsset.sizeBytes,
      sha256: schema.fnAsset.sha256,
      updatedAt: schema.fnAsset.updatedAt,
    })
    .from(schema.fnAsset)
    .where(compat(sql`${schema.fnAsset.fnId} = ${fnId}`) as never)
    .orderBy(compat(sql`${schema.fnAsset.path} asc`) as never);
  return rows.map((row) => ({
    id: row.id,
    path: row.path,
    kind: row.kind as AssetKind,
    mime: row.mime,
    sizeBytes: row.sizeBytes,
    sha256: row.sha256,
    updatedAt: row.updatedAt,
  }));
}

export async function getFunctionAssetBlob(input: {
  fnId: string;
  path: string;
}): Promise<AssetBlob | null> {
  const path = sanitizeAssetPath(input.path);
  const rows = await db
    .select({
      id: schema.fnAsset.id,
      path: schema.fnAsset.path,
      kind: schema.fnAsset.kind,
      mime: schema.fnAsset.mime,
      sizeBytes: schema.fnAsset.sizeBytes,
      sha256: schema.fnAsset.sha256,
      updatedAt: schema.fnAsset.updatedAt,
      content: schema.fnAsset.content,
    })
    .from(schema.fnAsset)
    .where(
      compat(
        sql`${schema.fnAsset.fnId} = ${input.fnId} and ${schema.fnAsset.path} = ${path}`,
      ) as never,
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    path: row.path,
    kind: row.kind as AssetKind,
    mime: row.mime,
    sizeBytes: row.sizeBytes,
    sha256: row.sha256,
    updatedAt: row.updatedAt,
    content: row.content as Buffer,
  };
}

interface UpsertInput {
  fnId: string;
  path: string;
  mime: string;
  content: Buffer;
}

async function getCapsState(fnId: string, excludeFnAssetId?: string) {
  const rows = await db
    .select({
      id: schema.fnAsset.id,
      sizeBytes: schema.fnAsset.sizeBytes,
    })
    .from(schema.fnAsset)
    .where(compat(sql`${schema.fnAsset.fnId} = ${fnId}`) as never);
  const others = excludeFnAssetId ? rows.filter((row) => row.id !== excludeFnAssetId) : rows;
  const totalBytes = others.reduce((acc, row) => acc + row.sizeBytes, 0);
  return { count: others.length, totalBytes };
}

export interface UpsertResult {
  asset: AssetSummary;
  created: boolean;
}

export async function upsertFunctionAsset(input: UpsertInput): Promise<UpsertResult> {
  const path = sanitizeAssetPath(input.path);
  if (input.content.length === 0) {
    throw new AssetError("empty_content", "asset content must not be empty");
  }
  if (input.content.length > ASSET_MAX_FILE_BYTES) {
    throw new AssetError(
      "file_too_large",
      `file is ${input.content.length} bytes, exceeds ${ASSET_MAX_FILE_BYTES}`,
      413,
    );
  }
  const fnRow = await loadFnRow(input.fnId);
  if (!fnRow) throw new AssetError("not_found", "function not found", 404);

  const classified = classifyAsset(path, input.mime);
  const sha = hashContent(input.content);
  const existingRows = await db
    .select({ id: schema.fnAsset.id })
    .from(schema.fnAsset)
    .where(
      compat(
        sql`${schema.fnAsset.fnId} = ${input.fnId} and ${schema.fnAsset.path} = ${path}`,
      ) as never,
    )
    .limit(1);
  const existingId = existingRows[0]?.id;
  const caps = await getCapsState(input.fnId, existingId);
  if (!existingId && caps.count + 1 > ASSET_MAX_FILES_PER_FN) {
    throw new AssetError(
      "file_count_exceeded",
      `function already has ${caps.count} assets (max ${ASSET_MAX_FILES_PER_FN})`,
      413,
    );
  }
  if (caps.totalBytes + input.content.length > ASSET_MAX_TOTAL_BYTES) {
    throw new AssetError(
      "total_size_exceeded",
      `total assets would exceed ${ASSET_MAX_TOTAL_BYTES} bytes`,
      413,
    );
  }

  const now = new Date();
  let assetId: string;
  let created: boolean;
  if (existingId) {
    assetId = existingId;
    created = false;
    await db
      .update(schema.fnAsset)
      .set({
        kind: classified.kind,
        mime: classified.mime,
        sizeBytes: input.content.length,
        sha256: sha,
        content: input.content,
        updatedAt: now,
      })
      .where(compat(sql`${schema.fnAsset.id} = ${existingId}`) as never);
  } else {
    assetId = genId("fas");
    created = true;
    await db.insert(schema.fnAsset).values({
      id: assetId,
      fnId: input.fnId,
      orgId: fnRow.orgId,
      path,
      kind: classified.kind,
      mime: classified.mime,
      sizeBytes: input.content.length,
      sha256: sha,
      content: input.content,
      createdAt: now,
      updatedAt: now,
    });
  }

  if (path === "README.md") {
    await syncReadmeToMarketplace(input.fnId, input.content.toString("utf8"));
  }

  return {
    created,
    asset: {
      id: assetId,
      path,
      kind: classified.kind,
      mime: classified.mime,
      sizeBytes: input.content.length,
      sha256: sha,
      updatedAt: now,
    },
  };
}

export async function renameFunctionAsset(input: {
  fnId: string;
  fromPath: string;
  toPath: string;
}): Promise<AssetSummary> {
  const fromPath = sanitizeAssetPath(input.fromPath);
  const toPath = sanitizeAssetPath(input.toPath);
  if (fromPath === toPath) {
    const blob = await getFunctionAssetBlob({ fnId: input.fnId, path: fromPath });
    if (!blob) throw new AssetError("not_found", "asset not found", 404);
    return blob;
  }
  const existing = await getFunctionAssetBlob({ fnId: input.fnId, path: fromPath });
  if (!existing) throw new AssetError("not_found", "asset not found", 404);
  const collisionRows = await db
    .select({ id: schema.fnAsset.id })
    .from(schema.fnAsset)
    .where(
      compat(
        sql`${schema.fnAsset.fnId} = ${input.fnId} and ${schema.fnAsset.path} = ${toPath}`,
      ) as never,
    )
    .limit(1);
  if (collisionRows[0]) {
    throw new AssetError("path_conflict", `another asset already exists at ${toPath}`, 409);
  }
  const classified = classifyAsset(toPath, existing.mime);
  const now = new Date();
  await db
    .update(schema.fnAsset)
    .set({
      path: toPath,
      kind: classified.kind,
      mime: classified.mime,
      updatedAt: now,
    })
    .where(compat(sql`${schema.fnAsset.id} = ${existing.id}`) as never);

  if (fromPath === "README.md") {
    await syncReadmeToMarketplace(input.fnId, "");
  }
  if (toPath === "README.md") {
    await syncReadmeToMarketplace(input.fnId, existing.content.toString("utf8"));
  }

  return {
    id: existing.id,
    path: toPath,
    kind: classified.kind,
    mime: classified.mime,
    sizeBytes: existing.sizeBytes,
    sha256: existing.sha256,
    updatedAt: now,
  };
}

export async function deleteFunctionAsset(input: { fnId: string; path: string }): Promise<void> {
  const path = sanitizeAssetPath(input.path);
  const result = await db
    .delete(schema.fnAsset)
    .where(
      compat(
        sql`${schema.fnAsset.fnId} = ${input.fnId} and ${schema.fnAsset.path} = ${path}`,
      ) as never,
    );
  if (path === "README.md") {
    await syncReadmeToMarketplace(input.fnId, "");
  }
  // Drizzle returns void on delete with where; nothing else to do.
  void result;
}

export async function syncReadmeToMarketplace(fnId: string, body: string): Promise<void> {
  const fnRow = await loadFnRow(fnId);
  if (!fnRow) return;
  const truncated = body.slice(0, 50_000);
  const now = new Date();
  await db
    .insert(schema.fnMarketplaceProfile)
    .values({
      fnId,
      orgId: fnRow.orgId,
      readme: truncated,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.fnMarketplaceProfile.fnId,
      set: { readme: truncated, updatedAt: now },
    });
}

export async function syncMarketplaceReadmeToAsset(fnId: string, readme: string): Promise<void> {
  const content = readme.trim();
  if (!content) {
    await deleteFunctionAsset({ fnId, path: "README.md" });
    return;
  }
  await upsertFunctionAsset({
    fnId,
    path: "README.md",
    mime: "text/markdown",
    content: Buffer.from(readme, "utf8"),
  });
}

export interface VersionAssetSummary {
  path: string;
  kind: AssetKind;
  mime: string;
  sizeBytes: number;
  sha256: string;
}

export async function snapshotAssetsToVersion(input: {
  fnId: string;
  versionId: string;
  orgId: string;
}): Promise<VersionAssetSummary[]> {
  const rows = await db
    .select({
      path: schema.fnAsset.path,
      kind: schema.fnAsset.kind,
      mime: schema.fnAsset.mime,
      sizeBytes: schema.fnAsset.sizeBytes,
      sha256: schema.fnAsset.sha256,
      content: schema.fnAsset.content,
    })
    .from(schema.fnAsset)
    .where(compat(sql`${schema.fnAsset.fnId} = ${input.fnId}`) as never);
  if (rows.length === 0) return [];
  const now = new Date();
  await db.insert(schema.fnVersionAsset).values(
    rows.map((row) => ({
      id: genId("fva"),
      versionId: input.versionId,
      fnId: input.fnId,
      orgId: input.orgId,
      path: row.path,
      kind: row.kind,
      mime: row.mime,
      sizeBytes: row.sizeBytes,
      sha256: row.sha256,
      content: row.content as Buffer,
      createdAt: now,
    })),
  );
  return rows.map((row) => ({
    path: row.path,
    kind: row.kind as AssetKind,
    mime: row.mime,
    sizeBytes: row.sizeBytes,
    sha256: row.sha256,
  }));
}

export async function listVersionAssets(versionId: string): Promise<AssetSummary[]> {
  const rows = await db
    .select({
      id: schema.fnVersionAsset.id,
      path: schema.fnVersionAsset.path,
      kind: schema.fnVersionAsset.kind,
      mime: schema.fnVersionAsset.mime,
      sizeBytes: schema.fnVersionAsset.sizeBytes,
      sha256: schema.fnVersionAsset.sha256,
      updatedAt: schema.fnVersionAsset.createdAt,
    })
    .from(schema.fnVersionAsset)
    .where(compat(sql`${schema.fnVersionAsset.versionId} = ${versionId}`) as never)
    .orderBy(compat(sql`${schema.fnVersionAsset.path} asc`) as never);
  return rows.map((row) => ({
    id: row.id,
    path: row.path,
    kind: row.kind as AssetKind,
    mime: row.mime,
    sizeBytes: row.sizeBytes,
    sha256: row.sha256,
    updatedAt: row.updatedAt,
  }));
}

export async function getVersionAssetBlob(input: {
  versionId: string;
  path: string;
}): Promise<AssetBlob | null> {
  const path = sanitizeAssetPath(input.path);
  const rows = await db
    .select({
      id: schema.fnVersionAsset.id,
      path: schema.fnVersionAsset.path,
      kind: schema.fnVersionAsset.kind,
      mime: schema.fnVersionAsset.mime,
      sizeBytes: schema.fnVersionAsset.sizeBytes,
      sha256: schema.fnVersionAsset.sha256,
      updatedAt: schema.fnVersionAsset.createdAt,
      content: schema.fnVersionAsset.content,
    })
    .from(schema.fnVersionAsset)
    .where(
      compat(
        sql`${schema.fnVersionAsset.versionId} = ${input.versionId} and ${schema.fnVersionAsset.path} = ${path}`,
      ) as never,
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    path: row.path,
    kind: row.kind as AssetKind,
    mime: row.mime,
    sizeBytes: row.sizeBytes,
    sha256: row.sha256,
    updatedAt: row.updatedAt,
    content: row.content as Buffer,
  };
}

export async function getCurrentVersionAssetBlobByFn(input: {
  fnId: string;
  path: string;
}): Promise<AssetBlob | null> {
  const fnRows = await db
    .select({ currentVersionId: schema.fn.currentVersionId, visibility: schema.fn.visibility })
    .from(schema.fn)
    .where(compat(sql`${schema.fn.id} = ${input.fnId}`) as never)
    .limit(1);
  const fnRow = fnRows[0];
  if (!fnRow || !fnRow.currentVersionId) return null;
  return getVersionAssetBlob({ versionId: fnRow.currentVersionId, path: input.path });
}

export function ensureFunctionVisibility(visibility: string, requiredPublic: boolean) {
  if (requiredPublic && visibility !== "public") {
    throw new AssetError("forbidden", "function is not public", 403);
  }
}
