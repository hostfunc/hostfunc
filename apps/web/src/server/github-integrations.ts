import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { env } from "@/lib/env";
import { db, genId, schema, sql } from "@hostfunc/db";
import { and, desc, eq } from "drizzle-orm";
import {
  exchangeGithubOauthCodeForToken,
  getGithubAuthenticatedUser,
  listGithubInstallationRepos,
  listGithubRepoBranches,
} from "./github-app";

function isMissingGithubRelationError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("does not exist") &&
    (message.includes("github_installation") ||
      message.includes("github_repo_access") ||
      message.includes("function_git_binding") ||
      message.includes("github_connection_audit"))
  );
}

type ConnectStatePayload = {
  orgId: string;
  userId: string;
  nonce: string;
  exp: number;
  returnTo: string;
  popup?: boolean;
};

type OrgMetadataShape = {
  integrations?: {
    config?: unknown;
    encrypted?: Record<string, string>;
    githubOnboardingSkipByUserId?: Record<string, true>;
    githubSelectedRepoIds?: number[];
  };
};

function stateSecret() {
  return env.BETTER_AUTH_SECRET;
}

function base64url(input: string) {
  return Buffer.from(input).toString("base64url");
}

function fromBase64url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function signState(value: string): string {
  return createHmac("sha256", stateSecret()).update(value).digest("base64url");
}

export function createGithubConnectState(input: {
  orgId: string;
  userId: string;
  returnTo?: string;
  popup?: boolean;
}): string {
  const returnTo = input.returnTo?.startsWith("/")
    ? input.returnTo
    : "/dashboard/settings/integrations";
  const payload: ConnectStatePayload = {
    orgId: input.orgId,
    userId: input.userId,
    nonce: genId("evt"),
    exp: Date.now() + 10 * 60_000,
    returnTo,
    ...(input.popup ? { popup: true } : {}),
  };
  const encoded = base64url(JSON.stringify(payload));
  const signature = signState(encoded);
  return `${encoded}.${signature}`;
}

export function verifyGithubConnectState(state: string): ConnectStatePayload {
  const [encoded, signature] = state.split(".");
  if (!encoded || !signature) throw new Error("github_state_invalid");
  const expected = signState(encoded);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("github_state_invalid");
  const payload = JSON.parse(fromBase64url(encoded)) as ConnectStatePayload;
  if (!payload.orgId || !payload.userId || !payload.exp || !payload.returnTo) {
    throw new Error("github_state_invalid");
  }
  if (Date.now() > payload.exp) throw new Error("github_state_expired");
  return payload;
}

export async function upsertGithubInstallationForOrg(input: {
  orgId: string;
  userId: string;
  oauthCode: string;
}) {
  const redirectUri = (env.GITHUB_INTEGRATIONS_REDIRECT_URI ?? env.GITHUB_OAUTH_REDIRECT_URI)?.trim();
  const accessToken = await exchangeGithubOauthCodeForToken({
    code: input.oauthCode,
    ...(redirectUri ? { redirectUri } : {}),
  });
  const ghUser = await getGithubAuthenticatedUser(accessToken);
  await storeGithubOauthToken(input.orgId, accessToken);
  await setGithubOnboardingSkipped({ orgId: input.orgId, userId: input.userId, skipped: false });
  const existing = await db.query.githubInstallation.findFirst({
    where: and(eq(schema.githubInstallation.orgId, input.orgId), eq(schema.githubInstallation.status, "active")),
  });
  if (existing) {
    await db
      .update(schema.githubInstallation)
      .set({
        githubInstallationId: 0,
        githubAccountLogin: ghUser.login,
        githubAccountType: ghUser.type,
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(schema.githubInstallation.id, existing.id));
    return { id: existing.id, accessToken };
  }
  const id = genId("ghi");
  await db.insert(schema.githubInstallation).values({
    id,
    orgId: input.orgId,
    githubInstallationId: 0,
    githubAccountLogin: ghUser.login,
    githubAccountType: ghUser.type,
    status: "active",
    createdByUserId: input.userId,
  });
  return { id, accessToken };
}

export async function syncGithubInstallationRepos(input: {
  orgId: string;
  accessToken: string;
}) {
  const repos = await listGithubInstallationRepos(input.accessToken);
  for (const repo of repos) {
    const existing = await db.query.githubRepoAccess.findFirst({
      where: and(eq(schema.githubRepoAccess.orgId, input.orgId), eq(schema.githubRepoAccess.repoId, repo.id)),
      columns: { id: true },
    });
    if (existing) {
      await db
        .update(schema.githubRepoAccess)
        .set({
          githubInstallationId: 0,
          owner: repo.owner.login,
          ownerAvatarUrl:
            repo.owner.avatar_url ?? `https://github.com/${encodeURIComponent(repo.owner.login)}.png?size=64`,
          name: repo.name,
          fullName: repo.full_name,
          defaultBranch: repo.default_branch,
          isPrivate: repo.private,
          isArchived: repo.archived,
          permissionsJson: repo.permissions ?? {},
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.githubRepoAccess.id, existing.id));
      continue;
    }
    await db.insert(schema.githubRepoAccess).values({
      id: genId("ghr"),
      orgId: input.orgId,
      githubInstallationId: 0,
      repoId: repo.id,
      owner: repo.owner.login,
      ownerAvatarUrl:
        repo.owner.avatar_url ?? `https://github.com/${encodeURIComponent(repo.owner.login)}.png?size=64`,
      name: repo.name,
      fullName: repo.full_name,
      defaultBranch: repo.default_branch,
      isPrivate: repo.private,
      isArchived: repo.archived,
      permissionsJson: repo.permissions ?? {},
      lastSyncedAt: new Date(),
    });
  }
  return repos.length;
}

export async function listGithubReposForOrg(orgId: string) {
  return db.query.githubRepoAccess.findMany({
    where: eq(schema.githubRepoAccess.orgId, orgId),
    orderBy: (t, { asc }) => [asc(t.fullName)],
  });
}

export async function getGithubSelectedRepoIdsForOrg(orgId: string): Promise<number[]> {
  const org = await db.query.organization.findFirst({
    where: eq(schema.organization.id, orgId),
    columns: { metadata: true },
  });
  const parsed = parseOrgMetadata(org?.metadata ?? null);
  const raw = parsed.integrations?.githubSelectedRepoIds ?? [];
  return raw.filter((value) => Number.isInteger(value) && value > 0);
}

export async function setGithubSelectedRepoIdsForOrg(input: { orgId: string; repoIds: number[] }) {
  const org = await db.query.organization.findFirst({
    where: eq(schema.organization.id, input.orgId),
    columns: { metadata: true },
  });
  const parsed = parseOrgMetadata(org?.metadata ?? null);
  const nextRepoIds = [...new Set(input.repoIds.filter((value) => Number.isInteger(value) && value > 0))];
  const next: OrgMetadataShape = {
    ...parsed,
    integrations: {
      ...(parsed.integrations ?? {}),
      githubSelectedRepoIds: nextRepoIds,
    },
  };
  await db
    .update(schema.organization)
    .set({ metadata: JSON.stringify(next) })
    .where(eq(schema.organization.id, input.orgId));
}

export async function listSelectedGithubReposForOrg(orgId: string) {
  const [repos, selectedRepoIds] = await Promise.all([
    listGithubReposForOrg(orgId),
    getGithubSelectedRepoIdsForOrg(orgId),
  ]);
  if (selectedRepoIds.length === 0) return [];
  const selected = new Set(selectedRepoIds);
  return repos.filter((repo) => selected.has(repo.repoId));
}

export async function refreshGithubReposForOrg(orgId: string) {
  const token = await getGithubOauthToken(orgId);
  if (!token) throw new Error("github_oauth_token_missing");
  return syncGithubInstallationRepos({ orgId, accessToken: token });
}

export async function listGithubBranchesForRepo(input: { orgId: string; repoId: number }) {
  const selectedRepoIds = await getGithubSelectedRepoIdsForOrg(input.orgId);
  if (selectedRepoIds.length === 0 || !selectedRepoIds.includes(input.repoId)) {
    throw new Error("github_repo_not_selected");
  }
  const repo = await db.query.githubRepoAccess.findFirst({
    where: and(eq(schema.githubRepoAccess.orgId, input.orgId), eq(schema.githubRepoAccess.repoId, input.repoId)),
  });
  if (!repo) throw new Error("github_repo_not_found");
  const token = await getGithubOauthToken(input.orgId);
  if (!token) throw new Error("github_oauth_token_missing");
  const branches = await listGithubRepoBranches(token, repo.owner, repo.name);
  return branches.map((branch) => branch.name);
}

export async function getGithubInstallationStatus(orgId: string) {
  try {
    const selectedRepoIds = await getGithubSelectedRepoIdsForOrg(orgId);
    const installation = await db.query.githubInstallation.findFirst({
      where: and(eq(schema.githubInstallation.orgId, orgId), eq(schema.githubInstallation.status, "active")),
      orderBy: (t, { desc: d }) => [d(t.updatedAt)],
    });
    if (!installation) {
      return { connected: false as const };
    }
    const countRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.githubRepoAccess)
      .where(
        and(
          eq(schema.githubRepoAccess.orgId, orgId),
          eq(schema.githubRepoAccess.githubInstallationId, installation.githubInstallationId),
        ),
      )
      .limit(1);
    const repoCount = countRows[0]?.count ?? 0;
    return {
      connected: true as const,
      installationId: installation.githubInstallationId,
      accountLogin: installation.githubAccountLogin,
      accountType: installation.githubAccountType,
      repoCount,
      selectedRepoCount: selectedRepoIds.length,
      updatedAt: installation.updatedAt,
    };
  } catch (error) {
    if (isMissingGithubRelationError(error)) {
      return { connected: false as const };
    }
    throw error;
  }
}

export async function disconnectGithubForOrg(input: { orgId: string; userId: string }) {
  await db
    .update(schema.githubInstallation)
    .set({ status: "disconnected", updatedAt: new Date() })
    .where(and(eq(schema.githubInstallation.orgId, input.orgId), eq(schema.githubInstallation.status, "active")));
  await db.delete(schema.githubRepoAccess).where(eq(schema.githubRepoAccess.orgId, input.orgId));
  await clearGithubOauthToken(input.orgId);
  await setGithubSelectedRepoIdsForOrg({ orgId: input.orgId, repoIds: [] });
  await recordGithubConnectionAudit({
    orgId: input.orgId,
    userId: input.userId,
    eventType: "disconnect",
    status: "ok",
    detailJson: {},
  });
}

export async function saveFunctionGithubBinding(input: {
  orgId: string;
  fnId: string;
  userId: string;
  repoId: number;
  branch: string;
  pathPrefix?: string | null;
}) {
  const repo = await db.query.githubRepoAccess.findFirst({
    where: and(eq(schema.githubRepoAccess.orgId, input.orgId), eq(schema.githubRepoAccess.repoId, input.repoId)),
  });
  if (!repo) throw new Error("github_repo_not_found");
  const selectedRepoIds = await getGithubSelectedRepoIdsForOrg(input.orgId);
  if (selectedRepoIds.length === 0 || !selectedRepoIds.includes(input.repoId)) {
    throw new Error("github_repo_not_selected");
  }
  const existing = await db.query.functionGitBinding.findFirst({
    where: and(
      eq(schema.functionGitBinding.orgId, input.orgId),
      eq(schema.functionGitBinding.fnId, input.fnId),
      eq(schema.functionGitBinding.provider, "github"),
    ),
  });
  if (existing) {
    await db
      .update(schema.functionGitBinding)
      .set({
        repoId: repo.repoId,
        repoFullName: repo.fullName,
        branch: input.branch,
        pathPrefix: input.pathPrefix ?? null,
        updatedAt: new Date(),
      })
      .where(eq(schema.functionGitBinding.id, existing.id));
    return;
  }
  await db.insert(schema.functionGitBinding).values({
    id: genId("fgb"),
    orgId: input.orgId,
    fnId: input.fnId,
    provider: "github",
    repoId: repo.repoId,
    repoFullName: repo.fullName,
    branch: input.branch,
    pathPrefix: input.pathPrefix ?? null,
    createdByUserId: input.userId,
  });
}

export async function getGithubOnboardingSkipState(input: { orgId: string; userId: string }) {
  const org = await db.query.organization.findFirst({
    where: eq(schema.organization.id, input.orgId),
    columns: { metadata: true },
  });
  const parsed = parseOrgMetadata(org?.metadata ?? null);
  return Boolean(parsed.integrations?.githubOnboardingSkipByUserId?.[input.userId]);
}

export async function setGithubOnboardingSkipped(input: { orgId: string; userId: string; skipped: boolean }) {
  const org = await db.query.organization.findFirst({
    where: eq(schema.organization.id, input.orgId),
    columns: { metadata: true },
  });
  const parsed = parseOrgMetadata(org?.metadata ?? null);
  const currentMap = parsed.integrations?.githubOnboardingSkipByUserId ?? {};
  const nextMap = { ...currentMap };
  if (input.skipped) {
    nextMap[input.userId] = true;
  } else {
    delete nextMap[input.userId];
  }
  const next: OrgMetadataShape = {
    ...parsed,
    integrations: {
      ...(parsed.integrations ?? {}),
      githubOnboardingSkipByUserId: nextMap,
    },
  };
  await db
    .update(schema.organization)
    .set({ metadata: JSON.stringify(next) })
    .where(eq(schema.organization.id, input.orgId));
}

export async function removeFunctionGithubBinding(input: { orgId: string; fnId: string }) {
  await db
    .delete(schema.functionGitBinding)
    .where(
      and(
        eq(schema.functionGitBinding.orgId, input.orgId),
        eq(schema.functionGitBinding.fnId, input.fnId),
        eq(schema.functionGitBinding.provider, "github"),
      ),
    );
}

export async function getFunctionGithubBinding(input: { orgId: string; fnId: string }) {
  return db.query.functionGitBinding.findFirst({
    where: and(
      eq(schema.functionGitBinding.orgId, input.orgId),
      eq(schema.functionGitBinding.fnId, input.fnId),
      eq(schema.functionGitBinding.provider, "github"),
    ),
    orderBy: [desc(schema.functionGitBinding.updatedAt)],
  });
}

function parseOrgMetadata(input: string | null): OrgMetadataShape {
  if (!input) return {};
  try {
    return JSON.parse(input) as OrgMetadataShape;
  } catch {
    return {};
  }
}

async function storeGithubOauthToken(orgId: string, accessToken: string) {
  const org = await db.query.organization.findFirst({
    where: eq(schema.organization.id, orgId),
    columns: { metadata: true },
  });
  const parsed = parseOrgMetadata(org?.metadata ?? null);
  const encrypted = {
    ...(parsed.integrations?.encrypted ?? {}),
    githubOauthToken: encryptSecret(accessToken),
  };
  const next: OrgMetadataShape = {
    integrations: {
      ...(parsed.integrations ?? {}),
      encrypted,
    },
  };
  await db
    .update(schema.organization)
    .set({ metadata: JSON.stringify(next) })
    .where(eq(schema.organization.id, orgId));
}

async function clearGithubOauthToken(orgId: string) {
  const org = await db.query.organization.findFirst({
    where: eq(schema.organization.id, orgId),
    columns: { metadata: true },
  });
  const parsed = parseOrgMetadata(org?.metadata ?? null);
  const encryptedRaw = parsed.integrations?.encrypted ?? {};
  const { githubOauthToken: _ignored, ...encrypted } = encryptedRaw;
  const next: OrgMetadataShape = {
    integrations: {
      ...(parsed.integrations ?? {}),
      encrypted,
    },
  };
  await db
    .update(schema.organization)
    .set({ metadata: JSON.stringify(next) })
    .where(eq(schema.organization.id, orgId));
}

async function getGithubOauthToken(orgId: string): Promise<string | null> {
  const org = await db.query.organization.findFirst({
    where: eq(schema.organization.id, orgId),
    columns: { metadata: true },
  });
  const parsed = parseOrgMetadata(org?.metadata ?? null);
  const encrypted = parsed.integrations?.encrypted?.githubOauthToken;
  if (!encrypted) return null;
  try {
    return decryptSecret(encrypted);
  } catch {
    return null;
  }
}

export async function recordGithubConnectionAudit(input: {
  orgId: string;
  userId: string;
  eventType: string;
  status: "ok" | "error";
  detailJson?: Record<string, unknown>;
}) {
  try {
    await db.insert(schema.githubConnectionAudit).values({
      id: genId("gca"),
      orgId: input.orgId,
      userId: input.userId,
      eventType: input.eventType,
      status: input.status,
      detailJson: input.detailJson ?? {},
    });
  } catch (error) {
    if (isMissingGithubRelationError(error)) return;
    throw error;
  }
}
