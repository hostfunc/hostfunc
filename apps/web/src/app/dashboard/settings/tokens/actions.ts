"use server";

import { requireOrgPermission } from "@/lib/session";
import { createApiToken, listApiTokens, revokeApiToken } from "@/server/api-tokens";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(64),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export async function getTokens() {
  const { orgId, session } = await requireOrgPermission("manage_tokens");
  return listApiTokens(orgId, session.user.id);
}

export async function createToken(input: z.infer<typeof createSchema>) {
  const { orgId, session } = await requireOrgPermission("manage_tokens");
  const parsed = createSchema.parse(input);
  const expiresAt = parsed.expiresInDays
    ? new Date(Date.now() + parsed.expiresInDays * 24 * 60 * 60 * 1000)
    : undefined;
  const tokenInput: {
    orgId: string;
    userId: string;
    name: string;
    expiresAt?: Date;
  } = {
    orgId,
    userId: session.user.id,
    name: parsed.name,
  };
  if (expiresAt) tokenInput.expiresAt = expiresAt;
  const created = await createApiToken(tokenInput);
  revalidatePath("/dashboard/settings/tokens");
  return {
    ok: true,
    token: created.token,
    row: {
      id: created.id,
      name: parsed.name,
      prefix: created.prefix,
      createdAt: new Date(),
      lastUsedAt: null,
      expiresAt: expiresAt ?? null,
    },
  };
}

export async function revokeToken(tokenId: string) {
  const { orgId, session } = await requireOrgPermission("manage_tokens");
  await revokeApiToken(orgId, session.user.id, tokenId);
  revalidatePath("/dashboard/settings/tokens");
  return { ok: true };
}
