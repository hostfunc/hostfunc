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
import {
  CheckCircle2,
  ChevronDown,
  KeyRound,
  Loader2,
  Sparkles,
  TriangleAlert,
  Waypoints,
} from "lucide-react";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { updateFunctionIntegrationOverridesStateAction } from "../../actions";

type WorkspaceSummary = {
  aiProvider: "openai" | "claude";
  aiModel: string;
  vectorPrimary: "external_http" | "postgres";
  vectorSecondary: "external_http" | "postgres" | "none";
  hasOpenAiKey: boolean;
  hasClaudeKey: boolean;
  openAiKeyPreview: string | null;
  claudeKeyPreview: string | null;
  hasVectorServiceUrl: boolean;
  hasVectorDatabaseUrl: boolean;
};

type OverrideFormInitial = {
  aiProvider: "" | "openai" | "claude";
  aiModel: string;
  vectorPrimary: "" | "external_http" | "postgres";
  vectorSecondary: "" | "none" | "external_http" | "postgres";
  hasOpenAiKey: boolean;
  hasClaudeKey: boolean;
  openAiKeyPreview: string | null;
  claudeKeyPreview: string | null;
  hasVectorServiceUrl: boolean;
  hasVectorDatabaseUrl: boolean;
};

type Props = {
  fnId: string;
  initial: {
    hasSavedFnOverrides: boolean;
    workspace: WorkspaceSummary;
    overrides: OverrideFormInitial;
  };
};

type ActionState = {
  ok?: boolean;
  message?: string;
  error?: { form?: string[] };
} | null;

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

function vectorBackendLabel(value: "external_http" | "postgres" | "none"): string {
  if (value === "external_http") return "External HTTP";
  if (value === "postgres") return "Postgres URL";
  return "None";
}

function providerLabel(provider: "openai" | "claude"): string {
  return provider === "openai" ? "OpenAI" : "Claude";
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

function ProviderLogo({ provider }: { provider: "openai" | "claude" }) {
  const src = provider === "openai" ? "/ChatGPT%20logo.svg" : "/Claude%20logo.svg";
  const fallbackLabel = provider === "openai" ? "O" : "C";
  return (
    <span
      className="inline-flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-[var(--color-border)] bg-white"
      aria-hidden="true"
    >
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover"
        onError={(event) => {
          event.currentTarget.style.display = "none";
          const container = event.currentTarget.parentElement;
          if (!container || container.textContent?.trim()) return;
          container.classList.add(
            provider === "openai" ? "text-emerald-400" : "text-violet-400",
            "bg-[var(--color-ink)]",
            "text-[10px]",
            "font-bold",
          );
          container.textContent = fallbackLabel;
        }}
      />
    </span>
  );
}

function CustomSelect({
  id,
  name,
  value,
  onChange,
  options,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selectedLabel = options.find((option) => option.value === value)?.label ?? value;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <>
      <input type="hidden" id={id} name={name} value={value} />
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex h-11 w-full items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-ink)] px-3 text-left text-[var(--color-bone)] transition hover:border-[var(--color-amber)]/40"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className="text-sm font-medium">{selectedLabel}</span>
          <ChevronDown
            className={`h-4 w-4 text-[var(--color-bone-faint)] transition ${open ? "rotate-180" : ""}`}
          />
        </button>
        {open ? (
          <div className="absolute z-20 mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-ink-elevated)] p-1 shadow-xl">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value === "" ? "__empty" : option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                    isSelected
                      ? "bg-[var(--color-amber)]/15 text-[var(--color-bone)]"
                      : "text-[var(--color-bone-muted)] hover:bg-white/[0.06] hover:text-[var(--color-bone)]"
                  }`}
                >
                  <span>{option.label}</span>
                  {isSelected ? (
                    <CheckCircle2 className="h-4 w-4 text-[var(--color-amber)]" />
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </>
  );
}

function WorkspaceDefaultsSummary({ workspace }: { workspace: WorkspaceSummary }) {
  const w = workspace;
  return (
    <div className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-ink)]/50 p-4 text-sm md:grid-cols-2">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-bone-faint)]">
          Provider
        </p>
        <p className="mt-1 font-medium text-[var(--color-bone)]">{providerLabel(w.aiProvider)}</p>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-bone-faint)]">
          Default model
        </p>
        <p className="mt-1 font-medium text-[var(--color-bone)]">{w.aiModel}</p>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-bone-faint)]">
          Vector primary
        </p>
        <p className="mt-1 font-medium text-[var(--color-bone)]">
          {vectorBackendLabel(w.vectorPrimary)}
        </p>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-bone-faint)]">
          Vector fallback
        </p>
        <p className="mt-1 font-medium text-[var(--color-bone)]">
          {vectorBackendLabel(w.vectorSecondary)}
        </p>
      </div>
      <div className="md:col-span-2 space-y-1 border-t border-[var(--color-border)] pt-3">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-bone-faint)]">
          Workspace API keys (masked)
        </p>
        <p className="text-[var(--color-bone-muted)]">
          OpenAI: {w.openAiKeyPreview ?? (w.hasOpenAiKey ? "Configured" : "Not configured")}
        </p>
        <p className="text-[var(--color-bone-muted)]">
          Claude: {w.claudeKeyPreview ?? (w.hasClaudeKey ? "Configured" : "Not configured")}
        </p>
      </div>
    </div>
  );
}

export function FunctionIntegrationsClient({ fnId, initial }: Props) {
  const [overrideUiEnabled, setOverrideUiEnabled] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateFunctionIntegrationOverridesStateAction,
    null,
  );

  const [aiProvider, setAiProvider] = useState<"" | "openai" | "claude">(
    initial.overrides.aiProvider,
  );
  const [aiModel, setAiModel] = useState(initial.overrides.aiModel);
  const [vectorPrimary, setVectorPrimary] = useState<"" | "external_http" | "postgres">(
    initial.overrides.vectorPrimary,
  );
  const [vectorSecondary, setVectorSecondary] = useState<
    "" | "none" | "external_http" | "postgres"
  >(initial.overrides.vectorSecondary);
  const [providerMenuOpen, setProviderMenuOpen] = useState(false);
  const providerMenuRef = useRef<HTMLDivElement | null>(null);

  const modelOptions = useMemo(() => {
    if (aiProvider === "") {
      return aiModel ? [aiModel] : [];
    }
    const base = modelsForProvider(aiProvider);
    return aiModel && !base.includes(aiModel) ? [aiModel, ...base] : base;
  }, [aiProvider, aiModel]);

  const providerLabelText = aiProvider === "" ? "Workspace default" : providerLabel(aiProvider);

  useEffect(() => {
    if (!providerMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!providerMenuRef.current) return;
      if (!providerMenuRef.current.contains(event.target as Node)) {
        setProviderMenuOpen(false);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProviderMenuOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, [providerMenuOpen]);

  const hasError = Boolean(state?.error?.form?.[0]);
  const hasSuccess = Boolean(state?.ok);

  return (
    <div className="space-y-6">
      <SettingsCard className="rounded-2xl bg-[var(--color-ink-elevated)]/80 shadow-xl">
        <SettingsCardHeader>
          <SettingsCardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-4 w-4 text-[var(--color-amber)]" />
            Workspace integration workflow
          </SettingsCardTitle>
          <SettingsCardDescription>
            By default this function uses the same AI and vector integration defaults as your
            workspace. Open the override editor only when this function needs different credentials,
            models, or vector routing.
          </SettingsCardDescription>
        </SettingsCardHeader>
        <SettingsCardContent className="space-y-4">
          <WorkspaceDefaultsSummary workspace={initial.workspace} />

          {initial.hasSavedFnOverrides ? (
            <p className="text-sm leading-relaxed text-[var(--color-bone-muted)]">
              This function has saved override secrets on file. They may still apply at runtime even
              while the override editor is hidden. Turn on the editor below to review or change
              them.
            </p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--color-bone-muted)]">
              {overrideUiEnabled
                ? "You are editing function-level overrides. Empty select values inherit workspace defaults."
                : "Override editor is hidden. Integration behavior follows your workspace unless saved overrides exist (see above)."}
            </p>
            <Button
              type="button"
              variant="outline"
              aria-pressed={overrideUiEnabled}
              onClick={() => setOverrideUiEnabled((v) => !v)}
              className={
                overrideUiEnabled
                  ? "shrink-0 rounded-full border-[var(--color-amber)]/50 bg-[var(--color-amber)]/10 text-[var(--color-bone)] hover:bg-[var(--color-amber)]/15"
                  : "shrink-0 rounded-full border-[var(--color-border)] text-[var(--color-bone)] hover:border-[var(--color-amber)]/40"
              }
            >
              {overrideUiEnabled ? "Hide override editor" : "Override workspace integrations"}
            </Button>
          </div>
        </SettingsCardContent>
      </SettingsCard>

      {overrideUiEnabled ? (
        <form action={formAction} className="space-y-6">
          <input type="hidden" name="fnId" value={fnId} />
          <div className="grid gap-6">
            <SettingsCard className="rounded-2xl bg-[var(--color-ink-elevated)]/80 shadow-xl">
              <SettingsCardHeader>
                <SettingsCardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-4 w-4 text-[var(--color-amber)]" />
                  AI overrides
                </SettingsCardTitle>
                <SettingsCardDescription>
                  Function-level overrides for `@hostfunc/sdk/ai` and `@hostfunc/sdk/agent`. Leave
                  provider as workspace default to inherit models and keys from the workspace.
                </SettingsCardDescription>
              </SettingsCardHeader>
              <SettingsCardContent className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="fn-aiProvider">Provider</Label>
                  <input type="hidden" id="fn-aiProvider" name="aiProvider" value={aiProvider} />
                  <div className="relative" ref={providerMenuRef}>
                    <button
                      type="button"
                      onClick={() => setProviderMenuOpen((open) => !open)}
                      className="flex h-11 w-full items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-ink)] px-3 text-left text-[var(--color-bone)] transition hover:border-[var(--color-amber)]/40"
                      aria-haspopup="listbox"
                      aria-expanded={providerMenuOpen}
                    >
                      <span className="inline-flex items-center gap-2">
                        {aiProvider === "" ? null : <ProviderLogo provider={aiProvider} />}
                        <span className="text-sm font-medium">{providerLabelText}</span>
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-[var(--color-bone-faint)] transition ${providerMenuOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {providerMenuOpen ? (
                      <div className="absolute z-20 mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-ink-elevated)] p-1 shadow-xl">
                        <button
                          type="button"
                          onClick={() => {
                            setAiProvider("");
                            setAiModel("");
                            setProviderMenuOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                            aiProvider === ""
                              ? "bg-[var(--color-amber)]/15 text-[var(--color-bone)]"
                              : "text-[var(--color-bone-muted)] hover:bg-white/[0.06] hover:text-[var(--color-bone)]"
                          }`}
                        >
                          <span>Workspace default</span>
                          {aiProvider === "" ? (
                            <CheckCircle2 className="h-4 w-4 text-[var(--color-amber)]" />
                          ) : null}
                        </button>
                        {(["openai", "claude"] as const).map((provider) => {
                          const isSelected = provider === aiProvider;
                          return (
                            <button
                              key={provider}
                              type="button"
                              onClick={() => {
                                setAiProvider(provider);
                                const nextModels = modelsForProvider(provider);
                                setAiModel(nextModels[0] ?? "");
                                setProviderMenuOpen(false);
                              }}
                              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                                isSelected
                                  ? "bg-[var(--color-amber)]/15 text-[var(--color-bone)]"
                                  : "text-[var(--color-bone-muted)] hover:bg-white/[0.06] hover:text-[var(--color-bone)]"
                              }`}
                            >
                              <span className="inline-flex items-center gap-2">
                                <ProviderLogo provider={provider} />
                                <span>{providerLabel(provider)}</span>
                              </span>
                              {isSelected ? (
                                <CheckCircle2 className="h-4 w-4 text-[var(--color-amber)]" />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fn-aiModel">Model override</Label>
                  <select
                    id="fn-aiModel"
                    name="aiModel"
                    value={aiModel}
                    onChange={(event) => setAiModel(event.target.value)}
                    disabled={aiProvider === ""}
                    className="h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-ink)] px-3 text-[var(--color-bone)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {aiProvider === "" ? (
                      <option value="">Workspace default</option>
                    ) : (
                      modelOptions.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fn-openaiApiKey">OpenAI API key</Label>
                  <Input
                    id="fn-openaiApiKey"
                    name="openaiApiKey"
                    placeholder="sk-..."
                    className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)]"
                  />
                  <p className="text-xs text-[var(--color-bone-faint)]">
                    {initial.overrides.openAiKeyPreview
                      ? `Current override: ${initial.overrides.openAiKeyPreview}`
                      : initial.overrides.hasOpenAiKey
                        ? "Current override: configured"
                        : "Current override: not configured"}
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fn-claudeApiKey">Claude API key</Label>
                  <Input
                    id="fn-claudeApiKey"
                    name="claudeApiKey"
                    placeholder="sk-ant-..."
                    className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)]"
                  />
                  <p className="text-xs text-[var(--color-bone-faint)]">
                    {initial.overrides.claudeKeyPreview
                      ? `Current override: ${initial.overrides.claudeKeyPreview}`
                      : initial.overrides.hasClaudeKey
                        ? "Current override: configured"
                        : "Current override: not configured"}
                  </p>
                </div>
              </SettingsCardContent>
            </SettingsCard>
          </div>

          <SettingsCard className="rounded-2xl bg-[var(--color-ink-elevated)]/80 shadow-xl">
            <SettingsCardHeader>
              <SettingsCardTitle className="flex items-center gap-2 text-lg">
                <KeyRound className="h-4 w-4 text-[var(--color-amber)]" />
                Credential health
              </SettingsCardTitle>
              <SettingsCardDescription>
                Function override credential presence (not workspace keys).
              </SettingsCardDescription>
            </SettingsCardHeader>
            <SettingsCardContent className="grid gap-2 md:grid-cols-2">
              <SecretStatus
                label="OpenAI API key override"
                present={initial.overrides.hasOpenAiKey}
              />
              <SecretStatus
                label="Claude API key override"
                present={initial.overrides.hasClaudeKey}
              />
              <SecretStatus
                label="Vector service URL override"
                present={initial.overrides.hasVectorServiceUrl}
              />
              <SecretStatus
                label="Vector DB URL override"
                present={initial.overrides.hasVectorDatabaseUrl}
              />
            </SettingsCardContent>
          </SettingsCard>

          <SettingsCard className="rounded-2xl bg-[var(--color-ink-elevated)]/80 shadow-xl">
            <SettingsCardHeader>
              <SettingsCardTitle className="flex items-center gap-2 text-lg">
                <Waypoints className="h-4 w-4 text-[var(--color-amber)]" />
                Vector backend order overrides
              </SettingsCardTitle>
              <SettingsCardDescription>
                Deterministic primary/fallback routing for `@hostfunc/sdk/vector` at function scope.
              </SettingsCardDescription>
            </SettingsCardHeader>
            <SettingsCardContent className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="fn-vectorPrimary">Primary backend</Label>
                <CustomSelect
                  id="fn-vectorPrimary"
                  name="vectorPrimary"
                  value={vectorPrimary}
                  onChange={(value) => setVectorPrimary(value as "" | "external_http" | "postgres")}
                  options={[
                    { value: "", label: "Workspace default" },
                    { value: "external_http", label: "External HTTP" },
                    { value: "postgres", label: "Postgres URL" },
                  ]}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fn-vectorSecondary">Fallback backend</Label>
                <CustomSelect
                  id="fn-vectorSecondary"
                  name="vectorSecondary"
                  value={vectorSecondary}
                  onChange={(value) =>
                    setVectorSecondary(value as "" | "none" | "external_http" | "postgres")
                  }
                  options={[
                    { value: "", label: "Workspace default" },
                    { value: "none", label: "None" },
                    { value: "external_http", label: "External HTTP" },
                    { value: "postgres", label: "Postgres URL" },
                  ]}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fn-vectorServiceUrl">Vector service URL (optional update)</Label>
                <Input
                  id="fn-vectorServiceUrl"
                  name="vectorServiceUrl"
                  placeholder="https://vector.example.com"
                  className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)]"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fn-vectorDatabaseUrl">Vector database URL (optional update)</Label>
                <Input
                  id="fn-vectorDatabaseUrl"
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
                    {state?.message ?? "Function integration overrides updated."}
                  </p>
                ) : (
                  <p className="text-sm text-[var(--color-bone-muted)]">
                    Empty secret fields keep existing override values. Empty select values inherit
                    workspace defaults.
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
                  "Save integration overrides"
                )}
              </Button>
            </SettingsCardFooter>
          </SettingsCard>
        </form>
      ) : null}
    </div>
  );
}
