import { requireOrgPermission } from "@/lib/session";
import { getFunctionForOrg } from "@/server/functions";
import {
  getFunctionGithubBinding,
  getGithubInstallationStatus,
  listSelectedGithubReposForOrg,
} from "@/server/github-integrations";
import { getFunctionIntegrationOverrides, getWorkspaceIntegrations } from "@/server/integrations";
import { notFound } from "next/navigation";
import { FunctionIntegrationsClient } from "./integrations-client";

function maskFnSecretPreview(value: string | null | undefined): string | null {
  if (!value) return null;
  const suffix = value.slice(-4);
  return `••••••••${suffix}`;
}

function toAiProvider(value: string | null | undefined): "" | "openai" | "claude" {
  return value === "openai" || value === "claude" ? value : "";
}

function toVectorPrimary(value: string | null | undefined): "" | "external_http" | "postgres" {
  return value === "external_http" || value === "postgres" ? value : "";
}

function toVectorSecondary(
  value: string | null | undefined,
): "" | "none" | "external_http" | "postgres" {
  return value === "none" || value === "external_http" || value === "postgres" ? value : "";
}

function hasAnyFunctionOverride(overrides: Record<string, string | null>): boolean {
  return Object.values(overrides).some((v) => v != null && v !== "");
}

export default async function FunctionIntegrationsSettingsPage({
  params,
}: {
  params: Promise<{ fn: string }>;
}) {
  const { orgId } = await requireOrgPermission("manage_secrets");
  const { fn: fnId } = await params;
  const fn = await getFunctionForOrg(orgId, fnId);
  if (!fn) notFound();

  const [overrides, workspace, githubStatus, githubRepos, githubBinding] = await Promise.all([
    getFunctionIntegrationOverrides(orgId, fnId),
    getWorkspaceIntegrations(orgId),
    getGithubInstallationStatus(orgId),
    listSelectedGithubReposForOrg(orgId),
    getFunctionGithubBinding({ orgId, fnId }),
  ]);

  const hasSavedFnOverrides = hasAnyFunctionOverride(overrides);

  return (
    <div className="animate-in space-y-10 fade-in duration-500 pb-10">
      <div className="flex flex-col justify-between gap-6 border-b border-[var(--color-border)] pb-6 md:flex-row md:items-center">
        <div>
          <h3 className="font-display text-4xl tracking-tight text-[var(--color-bone)]">
            Integrations
          </h3>
          <p className="mt-2 max-w-xl leading-relaxed text-[var(--color-bone-muted)]">
            AI, vector routing, and GitHub for this function. Each integration inherits your
            workspace default until you override it.
          </p>
        </div>
      </div>

      <FunctionIntegrationsClient
        fnId={fnId}
        initial={{
          hasSavedFnOverrides,
          workspace: {
            aiProvider: workspace.config.ai.provider,
            aiModel: workspace.config.ai.model,
            vectorPrimary: workspace.config.vector.primary,
            vectorSecondary: workspace.config.vector.secondary ?? "none",
            hasOpenAiKey: Boolean(workspace.encrypted.openaiApiKey),
            hasClaudeKey: Boolean(workspace.encrypted.claudeApiKey),
            openAiKeyPreview: workspace.previews.openaiApiKey,
            claudeKeyPreview: workspace.previews.claudeApiKey,
            hasVectorServiceUrl: Boolean(workspace.encrypted.vectorServiceUrl),
            hasVectorDatabaseUrl: Boolean(workspace.encrypted.vectorDatabaseUrl),
          },
          overrides: {
            aiProvider: toAiProvider(overrides.HF_FN_AI_PROVIDER),
            aiModel: overrides.HF_FN_AI_MODEL ?? "",
            vectorPrimary: toVectorPrimary(overrides.HF_FN_VECTOR_BACKEND_PRIMARY),
            vectorSecondary: toVectorSecondary(overrides.HF_FN_VECTOR_BACKEND_SECONDARY),
            hasOpenAiKey: Boolean(overrides.HF_FN_OPENAI_API_KEY),
            hasClaudeKey: Boolean(overrides.HF_FN_CLAUDE_API_KEY),
            openAiKeyPreview: maskFnSecretPreview(overrides.HF_FN_OPENAI_API_KEY),
            claudeKeyPreview: maskFnSecretPreview(overrides.HF_FN_CLAUDE_API_KEY),
            hasVectorServiceUrl: Boolean(overrides.HF_FN_VECTOR_SERVICE_URL),
            hasVectorDatabaseUrl: Boolean(overrides.HF_FN_VECTOR_DATABASE_URL),
          },
          github: {
            connected: githubStatus.connected,
            repos: githubRepos.map((repo) => ({
              repoId: repo.repoId,
              fullName: repo.fullName,
              defaultBranch: repo.defaultBranch,
              ownerAvatarUrl:
                repo.ownerAvatarUrl ||
                `https://github.com/${encodeURIComponent(repo.owner)}.png?size=64`,
            })),
            binding: githubBinding
              ? {
                  repoId: githubBinding.repoId,
                  repoFullName: githubBinding.repoFullName,
                  branch: githubBinding.branch,
                  pathPrefix: githubBinding.pathPrefix,
                }
              : null,
          },
        }}
      />
    </div>
  );
}
