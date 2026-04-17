import { requireOrgPermission } from "@/lib/session";
import { getFunctionIntegrationOverrides } from "@/server/integrations";
import { getFunctionForOrg } from "@/server/functions";
import { Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { FunctionIntegrationsClient } from "./integrations-client";

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

export default async function FunctionIntegrationsSettingsPage({
  params,
}: {
  params: Promise<{ fn: string }>;
}) {
  const { orgId } = await requireOrgPermission("manage_secrets");
  const { fn: fnId } = await params;
  const fn = await getFunctionForOrg(orgId, fnId);
  if (!fn) notFound();
  const overrides = await getFunctionIntegrationOverrides(orgId, fnId);

  return (
    <div className="animate-in space-y-10 fade-in duration-500 pb-10">
      <div className="flex flex-col justify-between gap-6 border-b border-[var(--color-border)] pb-6 md:flex-row md:items-center">
        <div>
          <h3 className="flex items-center gap-2 font-display text-4xl tracking-tight text-[var(--color-bone)]">
            SDK Integration Overrides <Sparkles className="h-6 w-6 text-[var(--color-amber)]" />
          </h3>
          <p className="mt-2 max-w-xl leading-relaxed text-[var(--color-bone-muted)]">
            Configure function-level AI and vector overrides. Leave fields empty to inherit workspace
            defaults.
          </p>
        </div>
      </div>

      <FunctionIntegrationsClient
        fnId={fnId}
        initial={{
          aiProvider: toAiProvider(overrides.HF_FN_AI_PROVIDER),
          aiModel: overrides.HF_FN_AI_MODEL ?? "",
          vectorPrimary: toVectorPrimary(overrides.HF_FN_VECTOR_BACKEND_PRIMARY),
          vectorSecondary: toVectorSecondary(overrides.HF_FN_VECTOR_BACKEND_SECONDARY),
          hasOpenAiKey: Boolean(overrides.HF_FN_OPENAI_API_KEY),
          hasClaudeKey: Boolean(overrides.HF_FN_CLAUDE_API_KEY),
          hasVectorServiceUrl: Boolean(overrides.HF_FN_VECTOR_SERVICE_URL),
          hasVectorDatabaseUrl: Boolean(overrides.HF_FN_VECTOR_DATABASE_URL),
        }}
      />
    </div>
  );
}

