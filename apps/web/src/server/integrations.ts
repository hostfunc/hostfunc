import "server-only";

import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { db, schema } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";
import { getSecretValueForFunction } from "./functions";

export type AiProvider = "openai" | "claude";
export type VectorBackend = "external_http" | "postgres";

export interface WorkspaceIntegrationConfig {
  ai: {
    provider: AiProvider;
    model: string;
  };
  vector: {
    primary: VectorBackend;
    secondary: VectorBackend | null;
  };
}

export interface ResolvedAiConfig {
  provider: AiProvider;
  model: string;
  apiKey: string;
}

export interface ResolvedVectorConfig {
  backends: Array<
    | { kind: "external_http"; serviceUrl: string }
    | { kind: "postgres"; databaseUrl: string }
  >;
}

export class IntegrationConfigError extends Error {
  constructor(
    public readonly code: "missing_secret" | "invalid_integration_config",
    message: string,
    public readonly detail: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "IntegrationConfigError";
  }
}

const DEFAULT_WORKSPACE_CONFIG: WorkspaceIntegrationConfig = {
  ai: {
    provider: "openai",
    model: "gpt-4o-mini",
  },
  vector: {
    primary: "external_http",
    secondary: "postgres",
  },
};

interface OrgMetadataShape {
  integrations?: {
    config?: WorkspaceIntegrationConfig;
    encrypted?: Record<string, string>;
  };
}

export async function getWorkspaceIntegrations(orgId: string): Promise<{
  config: WorkspaceIntegrationConfig;
  encrypted: Record<string, string>;
  previews: {
    openaiApiKey: string | null;
    claudeApiKey: string | null;
  };
}> {
  const org = await db.query.organization.findFirst({
    where: eq(schema.organization.id, orgId),
    columns: { metadata: true },
  });
  const parsed = parseOrgMetadata(org?.metadata ?? null);
  const encrypted = parsed.integrations?.encrypted ?? {};
  const openAiPlain = decryptMaybe(encrypted.openaiApiKey);
  const claudePlain = decryptMaybe(encrypted.claudeApiKey);

  return {
    config: {
      ai: {
        provider: parsed.integrations?.config?.ai?.provider ?? DEFAULT_WORKSPACE_CONFIG.ai.provider,
        model: parsed.integrations?.config?.ai?.model ?? DEFAULT_WORKSPACE_CONFIG.ai.model,
      },
      vector: {
        primary: parsed.integrations?.config?.vector?.primary ?? DEFAULT_WORKSPACE_CONFIG.vector.primary,
        secondary: parsed.integrations?.config?.vector?.secondary ?? DEFAULT_WORKSPACE_CONFIG.vector.secondary,
      },
    },
    encrypted,
    previews: {
      openaiApiKey: maskSecretPreview(openAiPlain),
      claudeApiKey: maskSecretPreview(claudePlain),
    },
  };
}

export async function updateWorkspaceIntegrations(input: {
  orgId: string;
  config: WorkspaceIntegrationConfig;
  plaintextSecrets: Partial<Record<"openaiApiKey" | "claudeApiKey" | "vectorServiceUrl" | "vectorDatabaseUrl", string>>;
}) {
  const current = await getWorkspaceIntegrations(input.orgId);
  const encrypted = { ...current.encrypted };
  for (const [key, value] of Object.entries(input.plaintextSecrets)) {
    if (!value) continue;
    encrypted[key] = encryptSecret(value);
  }

  const next: OrgMetadataShape = {
    integrations: {
      config: input.config,
      encrypted,
    },
  };

  await db
    .update(schema.organization)
    .set({ metadata: JSON.stringify(next) })
    .where(eq(schema.organization.id, input.orgId));
}

export async function resolveAiConfig(params: { orgId: string; fnId: string }): Promise<ResolvedAiConfig> {
  const workspace = await getWorkspaceIntegrations(params.orgId);
  const overrideProvider = await getSecretValueForFunction(params.orgId, params.fnId, "HF_FN_AI_PROVIDER");
  const overrideModel = await getSecretValueForFunction(params.orgId, params.fnId, "HF_FN_AI_MODEL");
  const provider = (overrideProvider as AiProvider | null) ?? workspace.config.ai.provider;
  const model = overrideModel ?? workspace.config.ai.model;

  const fnOpenAi = await getSecretValueForFunction(params.orgId, params.fnId, "HF_FN_OPENAI_API_KEY");
  const fnClaude = await getSecretValueForFunction(params.orgId, params.fnId, "HF_FN_CLAUDE_API_KEY");
  const orgOpenAi = decryptMaybe(workspace.encrypted.openaiApiKey);
  const orgClaude = decryptMaybe(workspace.encrypted.claudeApiKey);
  const apiKey = provider === "openai" ? fnOpenAi ?? orgOpenAi : fnClaude ?? orgClaude;
  if (!apiKey) {
    throw new IntegrationConfigError(
      "missing_secret",
      `Missing ${provider} API key for AI integration`,
      {
        provider,
        key: provider === "openai" ? "HF_FN_OPENAI_API_KEY or workspace openaiApiKey" : "HF_FN_CLAUDE_API_KEY or workspace claudeApiKey",
      },
    );
  }

  return { provider, model, apiKey };
}

export async function resolveAiConfigForGeneration(params: {
  orgId: string;
  fnId: string;
  provider: AiProvider;
  model: string;
}): Promise<ResolvedAiConfig> {
  const workspace = await getWorkspaceIntegrations(params.orgId);
  const fnOpenAi = await getSecretValueForFunction(params.orgId, params.fnId, "HF_FN_OPENAI_API_KEY");
  const fnClaude = await getSecretValueForFunction(params.orgId, params.fnId, "HF_FN_CLAUDE_API_KEY");
  const orgOpenAi = decryptMaybe(workspace.encrypted.openaiApiKey);
  const orgClaude = decryptMaybe(workspace.encrypted.claudeApiKey);
  const apiKey = params.provider === "openai" ? fnOpenAi ?? orgOpenAi : fnClaude ?? orgClaude;
  if (!apiKey) {
    throw new IntegrationConfigError(
      "missing_secret",
      `Missing ${params.provider} API key for AI generation`,
      {
        provider: params.provider,
        key:
          params.provider === "openai"
            ? "HF_FN_OPENAI_API_KEY or workspace openaiApiKey"
            : "HF_FN_CLAUDE_API_KEY or workspace claudeApiKey",
      },
    );
  }
  return { provider: params.provider, model: params.model, apiKey };
}

export async function resolveVectorConfig(params: {
  orgId: string;
  fnId: string;
}): Promise<ResolvedVectorConfig> {
  const workspace = await getWorkspaceIntegrations(params.orgId);
  const primary =
    (await getSecretValueForFunction(params.orgId, params.fnId, "HF_FN_VECTOR_BACKEND_PRIMARY")) ??
    workspace.config.vector.primary;
  const secondary =
    (await getSecretValueForFunction(params.orgId, params.fnId, "HF_FN_VECTOR_BACKEND_SECONDARY")) ??
    workspace.config.vector.secondary;

  const serviceUrl =
    (await getSecretValueForFunction(params.orgId, params.fnId, "HF_FN_VECTOR_SERVICE_URL")) ??
    decryptMaybe(workspace.encrypted.vectorServiceUrl);
  const databaseUrl =
    (await getSecretValueForFunction(params.orgId, params.fnId, "HF_FN_VECTOR_DATABASE_URL")) ??
    decryptMaybe(workspace.encrypted.vectorDatabaseUrl);

  const order = [primary, secondary].filter(Boolean) as VectorBackend[];
  const backends: ResolvedVectorConfig["backends"] = [];
  for (const backend of order) {
    if (backend === "external_http") {
      if (!serviceUrl) continue;
      backends.push({ kind: "external_http", serviceUrl });
      continue;
    }
    if (backend === "postgres") {
      if (!databaseUrl) continue;
      backends.push({ kind: "postgres", databaseUrl });
    }
  }
  if (backends.length === 0) {
    throw new IntegrationConfigError(
      "missing_secret",
      "No vector backend credential available for configured fallback order",
      {
        required: ["vectorServiceUrl", "vectorDatabaseUrl"],
      },
    );
  }
  return { backends };
}

export async function getFunctionIntegrationOverrides(orgId: string, fnId: string) {
  const keys = [
    "HF_FN_AI_PROVIDER",
    "HF_FN_AI_MODEL",
    "HF_FN_OPENAI_API_KEY",
    "HF_FN_CLAUDE_API_KEY",
    "HF_FN_VECTOR_BACKEND_PRIMARY",
    "HF_FN_VECTOR_BACKEND_SECONDARY",
    "HF_FN_VECTOR_SERVICE_URL",
    "HF_FN_VECTOR_DATABASE_URL",
  ] as const;
  const rows = await db
    .select({ key: schema.secret.key })
    .from(schema.secret)
    .where(and(eq(schema.secret.orgId, orgId), eq(schema.secret.fnId, fnId)));
  const keySet = new Set(rows.map((r) => r.key));
  const values = await Promise.all(keys.map((key) => getSecretValueForFunction(orgId, fnId, key)));
  return keys.reduce<Record<string, string | null>>((acc, key, idx) => {
    acc[key] = keySet.has(key) ? (values[idx] ?? null) : null;
    return acc;
  }, {});
}

function parseOrgMetadata(input: string | null): OrgMetadataShape {
  if (!input) return {};
  try {
    return JSON.parse(input) as OrgMetadataShape;
  } catch {
    return {};
  }
}

function decryptMaybe(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return decryptSecret(value);
  } catch {
    return null;
  }
}

function maskSecretPreview(value: string | null): string | null {
  if (!value) return null;
  const suffix = value.slice(-4);
  return `••••••••${suffix}`;
}
