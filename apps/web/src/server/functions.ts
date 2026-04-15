import "server-only";

import { db, genId, schema, sql } from "@hostfunc/db";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

function compat<T>(value: T): T {
  return value;
}

export async function listFunctionsForOrg(orgId: string) {
  return db
    .select({
      id: schema.fn.id,
      slug: schema.fn.slug,
      description: schema.fn.description,
      visibility: schema.fn.visibility,
      updatedAt: schema.fn.updatedAt,
    })
    .from(schema.fn)
    .where(compat(sql`${schema.fn.orgId} = ${orgId}`) as never)
    .orderBy(compat(sql`${schema.fn.updatedAt} desc`) as never);
}
export async function searchFunctionsForOrg(orgId: string, query?: string, visibility?: string) {
  const conditions = [sql`${schema.fn.orgId} = ${orgId}`];

  if (query) {
    const q = `%${query}%`;
    conditions.push(sql`(${schema.fn.slug} ilike ${q} or ${schema.fn.description} ilike ${q})`);
  }

  if (visibility && (visibility === "public" || visibility === "private")) {
    conditions.push(sql`${schema.fn.visibility} = ${visibility}`);
  }

  const whereClause = conditions.reduce((acc, condition) => sql`${acc} and ${condition}`);

  return db
    .select({
      id: schema.fn.id,
      slug: schema.fn.slug,
      description: schema.fn.description,
      visibility: schema.fn.visibility,
      updatedAt: schema.fn.updatedAt,
    })
    .from(schema.fn)
    .where(compat(whereClause) as never)
    .orderBy(compat(sql`${schema.fn.updatedAt} desc`) as never);
}

export async function getFunctionForOrg(orgId: string, fnId: string) {
  const rows = await db
    .select()
    .from(schema.fn)
    .where(compat(sql`${schema.fn.orgId} = ${orgId} and ${schema.fn.id} = ${fnId}`) as never)
    .limit(1);
  return rows[0] ?? null;
}

export async function getDraft(fnId: string, userId: string) {
  const rows = await db
    .select()
    .from(schema.fnDraft)
    .where(compat(sql`${schema.fnDraft.fnId} = ${fnId} and ${schema.fnDraft.userId} = ${userId}`) as never)
    .limit(1);
  return rows[0] ?? null;
}

export async function listSecretsForFunction(orgId: string, fnId: string) {
  const rows = await db
    .select({
      id: schema.secret.id,
      key: schema.secret.key,
      updatedAt: schema.secret.updatedAt,
    })
    .from(schema.secret)
    .where(compat(sql`${schema.secret.orgId} = ${orgId} and ${schema.secret.fnId} = ${fnId}`) as never)
    .orderBy(compat(sql`${schema.secret.key} asc`) as never);
  return rows;
}

export async function setSecretForFunction(input: {
  orgId: string;
  fnId: string;
  key: string;
  value: string;
  userId: string;
}) {
  const ciphertext = encryptSecret(input.value);
  const existing = await db
    .select({ id: schema.secret.id })
    .from(schema.secret)
    .where(
      compat(
        sql`${schema.secret.orgId} = ${input.orgId} and ${schema.secret.fnId} = ${input.fnId} and ${schema.secret.key} = ${input.key}`,
      ) as never,
    )
    .limit(1);

  if (existing[0]?.id) {
    await db
      .update(schema.secret)
      .set({ ciphertext, updatedAt: new Date() })
      .where(compat(sql`${schema.secret.id} = ${existing[0].id}`) as never);
    return existing[0].id;
  }

  const id = genId("sec");
  await db.insert(schema.secret).values({
    id,
    orgId: input.orgId,
    fnId: input.fnId,
    key: input.key,
    ciphertext,
    createdById: input.userId,
  });
  return id;
}

export async function deleteSecretForFunction(orgId: string, fnId: string, key: string) {
  await db
    .delete(schema.secret)
    .where(compat(sql`${schema.secret.orgId} = ${orgId} and ${schema.secret.fnId} = ${fnId} and ${schema.secret.key} = ${key}`) as never);
}

export async function getSecretValueForFunction(orgId: string, fnId: string, key: string) {
  const rows = await db
    .select({ ciphertext: schema.secret.ciphertext })
    .from(schema.secret)
    .where(compat(sql`${schema.secret.orgId} = ${orgId} and ${schema.secret.fnId} = ${fnId} and ${schema.secret.key} = ${key}`) as never)
    .limit(1);
  const row = rows[0];
  return row ? decryptSecret(row.ciphertext) : null;
}

export interface CreateFunctionInput {
  orgId: string;
  createdById: string;
  slug: string;
  description?: string;
  starterCode: string;
}

export async function createFunction(input: CreateFunctionInput) {
  const fnId = genId("fn");
  await db.transaction(async (tx) => {
    await tx.insert(schema.fn).values({
      id: fnId,
      orgId: input.orgId,
      createdById: input.createdById,
      slug: input.slug,
      description: input.description ?? "",
    });
    await tx.insert(schema.fnDraft).values({
      fnId,
      userId: input.createdById,
      code: input.starterCode,
    });
    // Every function gets a default HTTP trigger.
    await tx.insert(schema.trigger).values({
      id: genId("trg"),
      fnId,
      orgId: input.orgId,
      kind: "http",
      config: { http: { requireAuth: false } },
    });
  });
  return fnId;
}
