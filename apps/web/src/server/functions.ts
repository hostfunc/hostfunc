import "server-only";

import { db, genId, schema, sql } from "@hostfunc/db";

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
