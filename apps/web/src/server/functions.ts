import "server-only";

import { db, schema, genId } from "@hostfunc/db";
import { and, desc, eq, ilike, or } from "drizzle-orm";

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
    .where(eq(schema.fn.orgId, orgId))
    .orderBy(desc(schema.fn.updatedAt));
}
export async function searchFunctionsForOrg(orgId: string, query?: string, visibility?: string) {
  const conditions = [eq(schema.fn.orgId, orgId)];
  
  if (query) {
    conditions.push(
      or(
        ilike(schema.fn.slug, `%${query}%`),
        ilike(schema.fn.description, `%${query}%`)
      )!
    );
  }

  if (visibility && (visibility === "public" || visibility === "private")) {
    conditions.push(eq(schema.fn.visibility, visibility as "public" | "private"));
  }

  return db
    .select({
      id: schema.fn.id,
      slug: schema.fn.slug,
      description: schema.fn.description,
      visibility: schema.fn.visibility,
      updatedAt: schema.fn.updatedAt,
    })
    .from(schema.fn)
    .where(and(...conditions))
    .orderBy(desc(schema.fn.updatedAt));
}

export async function getFunctionForOrg(orgId: string, fnId: string) {
  const rows = await db
    .select()
    .from(schema.fn)
    .where(and(eq(schema.fn.orgId, orgId), eq(schema.fn.id, fnId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getDraft(fnId: string, userId: string) {
  const rows = await db
    .select()
    .from(schema.fnDraft)
    .where(and(eq(schema.fnDraft.fnId, fnId), eq(schema.fnDraft.userId, userId)))
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