import "server-only";

import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { generateApiToken, hashApiToken, verifyApiToken } from "@/lib/api-tokens";
import { db, genId, schema } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";

const WORKSPACE_SDK_TOKEN_NAME = "Workspace SDK Runtime";

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

export async function ensureWorkspaceSdkApiKey(input: { orgId: string; userId: string }): Promise<string> {
  const existing = await getWorkspaceSdkApiKey(input.orgId);
  if (existing) return existing;

  const created = await createApiToken({
    orgId: input.orgId,
    userId: input.userId,
    name: WORKSPACE_SDK_TOKEN_NAME,
  });
  await persistWorkspaceSdkApiKey(input.orgId, created.token);
  return created.token;
}

export async function getWorkspaceSdkApiKey(orgId: string): Promise<string | null> {
  const org = await db.query.organization.findFirst({
    where: eq(schema.organization.id, orgId),
    columns: { metadata: true },
  });
  if (!org?.metadata) return null;

  try {
    const parsed = JSON.parse(org.metadata) as {
      integrations?: { encrypted?: Record<string, string> };
    };
    const encrypted = parsed.integrations?.encrypted?.sdkApiKey;
    if (!encrypted) return null;
    const value = decryptSecret(encrypted);
    if (!value) return null;
    const actor = await authenticateApiToken(value);
    if (!actor || actor.orgId !== orgId) return null;
    return value;
  } catch {
    return null;
  }
}

async function persistWorkspaceSdkApiKey(orgId: string, token: string): Promise<void> {
  const org = await db.query.organization.findFirst({
    where: eq(schema.organization.id, orgId),
    columns: { metadata: true },
  });
  const encrypted = encryptSecret(token);

  let parsed: {
    integrations?: {
      config?: unknown;
      encrypted?: Record<string, string>;
    };
  } = {};
  if (org?.metadata) {
    try {
      parsed = JSON.parse(org.metadata) as typeof parsed;
    } catch {
      parsed = {};
    }
  }

  const next = {
    ...parsed,
    integrations: {
      ...(parsed.integrations ?? {}),
      encrypted: {
        ...(parsed.integrations?.encrypted ?? {}),
        sdkApiKey: encrypted,
      },
    },
  };

  await db.update(schema.organization).set({ metadata: JSON.stringify(next) }).where(eq(schema.organization.id, orgId));
}
