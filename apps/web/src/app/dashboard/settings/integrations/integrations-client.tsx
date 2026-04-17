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
import { updateWorkspaceIntegrationsAction } from "../actions";

type Props = {
  initial: {
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
                  key={option.value}
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
                  {isSelected ? <CheckCircle2 className="h-4 w-4 text-[var(--color-amber)]" /> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </>
  );
}

export function IntegrationsClient({ initial }: Props) {
  const [state, formAction, pending] = useActionState(updateWorkspaceIntegrationsAction, initialState);
  const [aiProvider, setAiProvider] = useState<"openai" | "claude">(initial.aiProvider);
  const [aiModel, setAiModel] = useState(initial.aiModel);
  const [vectorPrimary, setVectorPrimary] = useState<"external_http" | "postgres">(initial.vectorPrimary);
  const [vectorSecondary, setVectorSecondary] = useState<"external_http" | "postgres" | "none">(
    initial.vectorSecondary,
  );
  const [providerMenuOpen, setProviderMenuOpen] = useState(false);
  const providerMenuRef = useRef<HTMLDivElement | null>(null);
  const modelOptions = useMemo(() => {
    const base = modelsForProvider(aiProvider);
    return base.includes(aiModel) ? base : [aiModel, ...base];
  }, [aiProvider, aiModel]);
  const hasError = Boolean(state?.error?.form?.[0]);
  const hasSuccess = Boolean(state?.ok);
  const providerLabel = aiProvider === "openai" ? "OpenAI" : "Claude";

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

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-6">
        <SettingsCard className="rounded-2xl bg-[var(--color-ink-elevated)]/80 shadow-xl">
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
              <input type="hidden" id="aiProvider" name="aiProvider" value={aiProvider} />
              <div className="relative" ref={providerMenuRef}>
                <button
                  type="button"
                  onClick={() => setProviderMenuOpen((open) => !open)}
                  className="flex h-11 w-full items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-ink)] px-3 text-left text-[var(--color-bone)] transition hover:border-[var(--color-amber)]/40"
                  aria-haspopup="listbox"
                  aria-expanded={providerMenuOpen}
                >
                  <span className="inline-flex items-center gap-2">
                    <ProviderLogo provider={aiProvider} />
                    <span className="text-sm font-medium">{providerLabel}</span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-[var(--color-bone-faint)] transition ${providerMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {providerMenuOpen ? (
                  <div
                    className="absolute z-20 mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-ink-elevated)] p-1 shadow-xl"
                  >
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
                            <span>{provider === "openai" ? "OpenAI" : "Claude"}</span>
                          </span>
                          {isSelected ? <CheckCircle2 className="h-4 w-4 text-[var(--color-amber)]" /> : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
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
              <Label htmlFor="openaiApiKey">OpenAI API key</Label>
              <Input
                id="openaiApiKey"
                name="openaiApiKey"
                placeholder="sk-..."
                className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)]"
              />
              <p className="text-xs text-[var(--color-bone-faint)]">
                {initial.openAiKeyPreview ? `Current: ${initial.openAiKeyPreview}` : "Current: not configured"}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="claudeApiKey">Claude API key</Label>
              <Input
                id="claudeApiKey"
                name="claudeApiKey"
                placeholder="sk-ant-..."
                className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)]"
              />
              <p className="text-xs text-[var(--color-bone-faint)]">
                {initial.claudeKeyPreview ? `Current: ${initial.claudeKeyPreview}` : "Current: not configured"}
              </p>
            </div>
          </SettingsCardContent>
        </SettingsCard>
      </div>

      <SettingsCard className="rounded-2xl bg-[var(--color-ink-elevated)]/80 shadow-xl">
        <SettingsCardHeader>
          <SettingsCardTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="h-4 w-4 text-[var(--color-amber)]" />
            Credential Health
          </SettingsCardTitle>
          <SettingsCardDescription>Current workspace credential presence.</SettingsCardDescription>
        </SettingsCardHeader>
        <SettingsCardContent className="grid gap-2 md:grid-cols-2">
          <SecretStatus label="OpenAI API key" present={initial.hasOpenAiKey} />
          <SecretStatus label="Claude API key" present={initial.hasClaudeKey} />
          <SecretStatus label="Vector service URL" present={initial.hasVectorServiceUrl} />
          <SecretStatus label="Vector DB URL" present={initial.hasVectorDatabaseUrl} />
        </SettingsCardContent>
      </SettingsCard>

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
            <CustomSelect
              id="vectorPrimary"
              name="vectorPrimary"
              value={vectorPrimary}
              onChange={(value) => setVectorPrimary(value as "external_http" | "postgres")}
              options={[
                { value: "external_http", label: "External HTTP" },
                { value: "postgres", label: "Postgres URL" },
              ]}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="vectorSecondary">Fallback backend</Label>
            <CustomSelect
              id="vectorSecondary"
              name="vectorSecondary"
              value={vectorSecondary}
              onChange={(value) =>
                setVectorSecondary(value as "external_http" | "postgres" | "none")
              }
              options={[
                { value: "none", label: "None" },
                { value: "external_http", label: "External HTTP" },
                { value: "postgres", label: "Postgres URL" },
              ]}
            />
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
