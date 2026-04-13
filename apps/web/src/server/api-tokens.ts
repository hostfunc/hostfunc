import "server-only";

import { generateApiToken, hashApiToken, verifyApiToken } from "@/lib/api-tokens";
import { db, genId, schema } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";

export async function listApiTokens(orgId: string, userId: string) {
  return db
    .select({
      id: schema.apiToken.id,
      name: schema.apiToken.name,
      prefix: schema.apiToken.prefix,
      lastUsedAt: schema.apiToken.lastUsedAt,
      expiresAt: schema.apiToken.expiresAt,
      createdAt: schema.apiToken.createdAt,
    })
    .from(schema.apiToken)
    .where(and(eq(schema.apiToken.orgId, orgId), eq(schema.apiToken.userId, userId)));
}

export async function createApiToken(input: {
  orgId: string;
  userId: string;
  name: string;
  expiresAt?: Date;
}) {
  const { token, prefix } = generateApiToken();
  const hashedKey = await hashApiToken(token);
  const id = genId("tok");
  await db.insert(schema.apiToken).values({
    id,
    orgId: input.orgId,
    userId: input.userId,
    name: input.name,
    prefix,
    hashedKey,
    expiresAt: input.expiresAt,
  });
  return { id, token, prefix };
}

export async function revokeApiToken(orgId: string, userId: string, tokenId: string) {
  await db
    .delete(schema.apiToken)
    .where(
      and(
        eq(schema.apiToken.id, tokenId),
        eq(schema.apiToken.orgId, orgId),
        eq(schema.apiToken.userId, userId),
      ),
    );
}

export async function authenticateApiToken(token: string): Promise<{
  tokenId: string;
  orgId: string;
  userId: string;
  name: string;
} | null> {
  const prefix = token.slice(0, 20);
  const rows = await db
    .select({
      id: schema.apiToken.id,
      orgId: schema.apiToken.orgId,
      userId: schema.apiToken.userId,
      name: schema.apiToken.name,
      hashedKey: schema.apiToken.hashedKey,
      expiresAt: schema.apiToken.expiresAt,
    })
    .from(schema.apiToken)
    .where(eq(schema.apiToken.prefix, prefix));

  for (const row of rows) {
    const isValid = await verifyApiToken(token, row.hashedKey);
    if (!isValid) continue;
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return null;
    await db
      .update(schema.apiToken)
      .set({ lastUsedAt: new Date() })
      .where(eq(schema.apiToken.id, row.id));
    return {
      tokenId: row.id,
      orgId: row.orgId,
      userId: row.userId,
      name: row.name,
    };
  }
  return null;
}
