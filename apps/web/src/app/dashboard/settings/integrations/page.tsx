import { requireOrgPermission } from "@/lib/session";
import { getWorkspaceIntegrations } from "@/server/integrations";
import { IntegrationsClient } from "./integrations-client";

export default async function IntegrationsSettingsPage() {
  const { orgId } = await requireOrgPermission("manage_workspace_settings");
  const current = await getWorkspaceIntegrations(orgId);

  return (
    <div className="animate-in space-y-10 fade-in duration-500 pb-10">
      <div className="flex flex-col justify-between gap-6 border-b border-[var(--color-border)] pb-6 md:flex-row md:items-center">
        <div>
          <h3 className="font-display text-4xl tracking-tight text-[var(--color-bone)]">
            AI + Vector Integrations
          </h3>
          <p className="mt-2 max-w-xl leading-relaxed text-[var(--color-bone-muted)]">
            Configure workspace defaults for SDK AI, Agent, and Vector modules. Function-level settings
            can override these defaults.
          </p>
        </div>
      </div>

      <IntegrationsClient
        initial={{
          aiProvider: current.config.ai.provider,
          aiModel: current.config.ai.model,
          vectorPrimary: current.config.vector.primary,
          vectorSecondary: current.config.vector.secondary ?? "none",
          hasOpenAiKey: Boolean(current.encrypted.openaiApiKey),
          hasClaudeKey: Boolean(current.encrypted.claudeApiKey),
          openAiKeyPreview: current.previews.openaiApiKey,
          claudeKeyPreview: current.previews.claudeApiKey,
          hasVectorServiceUrl: Boolean(current.encrypted.vectorServiceUrl),
          hasVectorDatabaseUrl: Boolean(current.encrypted.vectorDatabaseUrl),
        }}
      />
    </div>
  );
}
