"use client";

import {
  SettingsCard,
  SettingsCardContent,
  SettingsCardDescription,
  SettingsCardFooter,
  SettingsCardHeader,
  SettingsCardTitle,
} from "@/components/settings/settings-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, KeyRound, Loader2, Sparkles, TriangleAlert, Waypoints } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { updateWorkspaceIntegrationsAction } from "../actions";

type Props = {
  initial: {
    aiProvider: "openai" | "claude";
    aiModel: string;
    vectorPrimary: "external_http" | "postgres";
    vectorSecondary: "external_http" | "postgres" | "none";
    hasOpenAiKey: boolean;
    hasClaudeKey: boolean;
    hasVectorServiceUrl: boolean;
    hasVectorDatabaseUrl: boolean;
  };
};

const initialState = null;
const OPENAI_MODELS = [
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  "gpt-4o",
  "gpt-4o-mini",
  "o4-mini",
  "o3-mini",
] as const;

const CLAUDE_MODELS = [
  "claude-opus-4-7-latest",
  "claude-sonnet-4-6-latest",
  "claude-haiku-4-5-20251001",
  "claude-opus-4-6",
  "claude-opus-4-5-20251101",
  "claude-sonnet-4-5-20250929",
  "claude-opus-4-1-20250805",
  "claude-opus-4-20250514",
  "claude-sonnet-4-20250514",
  "claude-3-haiku-20240307",
] as const;

function modelsForProvider(provider: "openai" | "claude"): readonly string[] {
  return provider === "openai" ? OPENAI_MODELS : CLAUDE_MODELS;
}

function SecretStatus({ label, present }: { label: string; present: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-ink)]/70 px-3 py-2">
      <span className="text-sm text-[var(--color-bone-muted)]">{label}</span>
      <Badge
        variant="outline"
        className={
          present
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
            : "border-amber-500/40 bg-amber-500/10 text-amber-200"
        }
      >
        {present ? "Configured" : "Missing"}
      </Badge>
    </div>
  );
}

export function IntegrationsClient({ initial }: Props) {
  const [state, formAction, pending] = useActionState(updateWorkspaceIntegrationsAction, initialState);
  const [aiProvider, setAiProvider] = useState<"openai" | "claude">(initial.aiProvider);
  const [aiModel, setAiModel] = useState(initial.aiModel);
  const modelOptions = useMemo(() => {
    const base = modelsForProvider(aiProvider);
    return base.includes(aiModel) ? base : [aiModel, ...base];
  }, [aiProvider, aiModel]);
  const hasError = Boolean(state?.error?.form?.[0]);
  const hasSuccess = Boolean(state?.ok);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-3">
        <SettingsCard className="rounded-2xl bg-[var(--color-ink-elevated)]/80 shadow-xl xl:col-span-2">
          <SettingsCardHeader>
            <SettingsCardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-4 w-4 text-[var(--color-amber)]" />
              AI Defaults
            </SettingsCardTitle>
            <SettingsCardDescription>
              Used by `@hostfunc/sdk/ai` and `@hostfunc/sdk/agent` unless function overrides are set.
            </SettingsCardDescription>
          </SettingsCardHeader>
          <SettingsCardContent className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="aiProvider">Provider</Label>
              <select
                id="aiProvider"
                name="aiProvider"
                value={aiProvider}
                onChange={(event) => {
                  const nextProvider = event.target.value as "openai" | "claude";
                  setAiProvider(nextProvider);
                  const nextModels = modelsForProvider(nextProvider);
                  setAiModel(nextModels[0] ?? "");
                }}
                className="h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-ink)] px-3 text-[var(--color-bone)]"
              >
                <option value="openai">OpenAI</option>
                <option value="claude">Claude</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="aiModel">Default model</Label>
              <select
                id="aiModel"
                name="aiModel"
                value={aiModel}
                onChange={(event) => setAiModel(event.target.value)}
                className="h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-ink)] px-3 text-[var(--color-bone)]"
              >
                {modelOptions.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="openaiApiKey">OpenAI API key (optional update)</Label>
              <Input
                id="openaiApiKey"
                name="openaiApiKey"
                placeholder="sk-..."
                className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="claudeApiKey">Claude API key (optional update)</Label>
              <Input
                id="claudeApiKey"
                name="claudeApiKey"
                placeholder="sk-ant-..."
                className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)]"
              />
            </div>
          </SettingsCardContent>
        </SettingsCard>

        <SettingsCard className="rounded-2xl bg-[var(--color-ink-elevated)]/80 shadow-xl">
          <SettingsCardHeader>
            <SettingsCardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="h-4 w-4 text-[var(--color-amber)]" />
              Credential Health
            </SettingsCardTitle>
            <SettingsCardDescription>Current workspace credential presence.</SettingsCardDescription>
          </SettingsCardHeader>
          <SettingsCardContent className="space-y-2">
            <SecretStatus label="OpenAI API key" present={initial.hasOpenAiKey} />
            <SecretStatus label="Claude API key" present={initial.hasClaudeKey} />
            <SecretStatus label="Vector service URL" present={initial.hasVectorServiceUrl} />
            <SecretStatus label="Vector DB URL" present={initial.hasVectorDatabaseUrl} />
          </SettingsCardContent>
        </SettingsCard>
      </div>

      <SettingsCard className="rounded-2xl bg-[var(--color-ink-elevated)]/80 shadow-xl">
        <SettingsCardHeader>
          <SettingsCardTitle className="flex items-center gap-2 text-lg">
            <Waypoints className="h-4 w-4 text-[var(--color-amber)]" />
            Vector Backend Order
          </SettingsCardTitle>
          <SettingsCardDescription>
            Configure deterministic primary/fallback routing for `@hostfunc/sdk/vector`.
          </SettingsCardDescription>
        </SettingsCardHeader>
        <SettingsCardContent className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="vectorPrimary">Primary backend</Label>
            <select
              id="vectorPrimary"
              name="vectorPrimary"
              defaultValue={initial.vectorPrimary}
              className="h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-ink)] px-3 text-[var(--color-bone)]"
            >
              <option value="external_http">External HTTP</option>
              <option value="postgres">Postgres URL</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="vectorSecondary">Fallback backend</Label>
            <select
              id="vectorSecondary"
              name="vectorSecondary"
              defaultValue={initial.vectorSecondary}
              className="h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-ink)] px-3 text-[var(--color-bone)]"
            >
              <option value="none">None</option>
              <option value="external_http">External HTTP</option>
              <option value="postgres">Postgres URL</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="vectorServiceUrl">Vector service URL (optional update)</Label>
            <Input
              id="vectorServiceUrl"
              name="vectorServiceUrl"
              placeholder="https://vector.example.com"
              className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)]"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="vectorDatabaseUrl">Vector database URL (optional update)</Label>
            <Input
              id="vectorDatabaseUrl"
              name="vectorDatabaseUrl"
              placeholder="postgres://..."
              className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)]"
            />
          </div>
        </SettingsCardContent>
        <SettingsCardFooter className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="space-y-1">
            {hasError ? (
              <p className="flex items-center gap-2 text-sm text-red-300">
                <TriangleAlert className="h-4 w-4" />
                {state?.error?.form?.[0]}
              </p>
            ) : null}
            {hasSuccess ? (
              <p className="flex items-center gap-2 text-sm text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                {state?.message ?? "Integration defaults updated."}
              </p>
            ) : (
              <p className="text-sm text-[var(--color-bone-muted)]">
                Empty secret fields keep existing stored values.
              </p>
            )}
          </div>
          <Button
            type="submit"
            disabled={pending}
            className="rounded-full bg-[var(--color-amber)] px-6 text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)] disabled:opacity-70"
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Integration Defaults"
            )}
          </Button>
        </SettingsCardFooter>
      </SettingsCard>
    </form>
  );
}
