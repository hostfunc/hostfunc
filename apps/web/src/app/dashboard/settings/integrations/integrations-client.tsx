"use client";

import {
  SettingsCard,
  SettingsCardContent,
  SettingsCardDescription,
  SettingsCardFooter,
  SettingsCardHeader,
  SettingsCardTitle,
} from "@/components/settings/settings-card";
import { GithubOauthConnectButton } from "@/components/github/oauth-connect-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Database,
  ExternalLink,
  KeyRound,
  Loader2,
  PlugZap,
  TriangleAlert,
  Waypoints,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
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
    github:
      | { connected: false }
      | {
          connected: true;
          installationId: number;
          accountLogin: string;
          accountType: string;
          repoCount: number;
          selectedRepoCount: number;
          updatedAt: Date;
        };
    githubRepos: Array<{
      repoId: number;
      fullName: string;
      defaultBranch: string;
      private: boolean;
      archived: boolean;
    }>;
    githubSelectedRepoIds: number[];
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

function ConnectorLogo({
  src,
  fallback,
}: {
  src?: string | undefined;
  fallback: string;
}) {
  if (!src) {
    return (
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-ink)] text-xs font-semibold text-[var(--color-bone-muted)]">
        {fallback}
      </span>
    );
  }
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-[var(--color-border)] bg-white">
      <img src={src} alt="" aria-hidden="true" className="h-full w-full object-cover" />
    </span>
  );
}

function ConnectorCard({
  title,
  subtitle,
  logoSrc,
  fallback,
  connected,
  active,
  onOpen,
}: {
  title: string;
  subtitle: string;
  logoSrc?: string;
  fallback: string;
  connected: boolean;
  active: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group w-full rounded-xl border p-4 text-left transition ${
        active
          ? "border-[var(--color-amber)]/50 bg-[var(--color-amber)]/10"
          : "border-[var(--color-border)] bg-[var(--color-ink)]/50 hover:border-[var(--color-amber)]/35"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <ConnectorLogo src={logoSrc} fallback={fallback} />
          <div>
            <p className="text-sm font-medium text-[var(--color-bone)]">{title}</p>
            <p className="text-xs text-[var(--color-bone-faint)]">{subtitle}</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={
            connected
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border-amber-500/40 bg-amber-500/10 text-amber-200"
          }
        >
          {connected ? "Connected" : "Needs key"}
        </Badge>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-bone-muted)]">
        <span>{connected ? "Edit credentials" : "Connect provider"}</span>
        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
      </div>
    </button>
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
  const searchParams = useSearchParams();
  const [state, formAction, pending] = useActionState(updateWorkspaceIntegrationsAction, initialState);
  const [aiProvider, setAiProvider] = useState<"openai" | "claude">(initial.aiProvider);
  const [aiModel, setAiModel] = useState(initial.aiModel);
  const [vectorPrimary, setVectorPrimary] = useState<"external_http" | "postgres">(initial.vectorPrimary);
  const [vectorSecondary, setVectorSecondary] = useState<"external_http" | "postgres" | "none">(
    initial.vectorSecondary,
  );
  const [providerMenuOpen, setProviderMenuOpen] = useState(false);
  const providerMenuRef = useRef<HTMLDivElement | null>(null);
  const [activeAiConnector, setActiveAiConnector] = useState<"openai" | "claude">(
    initial.aiProvider,
  );
  const [showAiConfig, setShowAiConfig] = useState(false);
  const [showVectorConfig, setShowVectorConfig] = useState(false);
  const modelOptions = useMemo(() => {
    const base = modelsForProvider(aiProvider);
    return base.includes(aiModel) ? base : [aiModel, ...base];
  }, [aiProvider, aiModel]);
  const hasError = Boolean(state?.error?.form?.[0]);
  const hasSuccess = Boolean(state?.ok);
  const githubState = searchParams.get("github");
  const githubReason = searchParams.get("reason");
  const providerLabel = aiProvider === "openai" ? "OpenAI" : "Claude";
  const [repoSearch, setRepoSearch] = useState("");
  const [selectedRepoIds, setSelectedRepoIds] = useState<number[]>(initial.githubSelectedRepoIds);
  const [repoSaveBusy, setRepoSaveBusy] = useState(false);
  const [repoActionMessage, setRepoActionMessage] = useState<string | null>(null);
  const filteredGithubRepos = useMemo(() => {
    const query = repoSearch.trim().toLowerCase();
    if (!query) return initial.githubRepos;
    return initial.githubRepos.filter((repo) => repo.fullName.toLowerCase().includes(query));
  }, [initial.githubRepos, repoSearch]);
  const health = useMemo(() => {
    const connectedCount = [
      initial.hasOpenAiKey,
      initial.hasClaudeKey,
      initial.hasVectorServiceUrl,
      initial.hasVectorDatabaseUrl,
    ].filter(Boolean).length;
    return { connectedCount, total: 4 };
  }, [initial]);

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
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--color-bone)]">Integration Hub</p>
            <p className="mt-1 text-xs text-[var(--color-bone-faint)]">
              OAuth-style connect UX with secure key-backed credentials.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-[var(--color-border)] text-[var(--color-bone-muted)]">
              {health.connectedCount}/{health.total} configured
            </Badge>
            <Badge variant="outline" className="border-[var(--color-border)] text-[var(--color-bone-muted)]">
              Workspace defaults
            </Badge>
          </div>
        </div>
      </div>

      <SettingsCard className="rounded-2xl bg-[var(--color-ink-elevated)]/80 shadow-xl">
        <SettingsCardHeader>
          <SettingsCardTitle className="flex items-center gap-2 text-lg">
            <PlugZap className="h-4 w-4 text-[var(--color-amber)]" />
            GitHub OAuth Integration
          </SettingsCardTitle>
          <SettingsCardDescription>
            Connect GitHub once for this workspace to allow function-level repo and branch selection.
          </SettingsCardDescription>
        </SettingsCardHeader>
        <SettingsCardContent className="space-y-4">
          {githubState === "connected" ? (
            <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              GitHub connected successfully.
            </p>
          ) : null}
          {githubState === "error" ? (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              GitHub connection failed{githubReason ? `: ${githubReason}` : "."}
            </p>
          ) : null}
          <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-ink)]/60 p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-[var(--color-bone)]">
                {initial.github.connected
                  ? `Connected to ${initial.github.accountLogin}`
                  : "Not connected to GitHub"}
              </p>
              <p className="text-xs text-[var(--color-bone-faint)]">
                {initial.github.connected
                  ? `${initial.github.repoCount} repositories synced · ${
                      initial.github.selectedRepoCount
                    } selected`
                  : "Connect to authorize repository and branch access."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={
                  initial.github.connected
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-amber-500/40 bg-amber-500/10 text-amber-200"
                }
              >
                {initial.github.connected ? "Connected" : "Disconnected"}
              </Badge>
              {initial.github.connected ? (
                <>
                  <GithubOauthConnectButton
                    returnTo="/dashboard/settings/integrations"
                    label="Update permissions"
                    className="border border-[var(--color-border)] bg-transparent text-[var(--color-bone)] hover:bg-white/[0.04]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="border-[var(--color-border)] bg-transparent text-[var(--color-bone)] hover:bg-white/[0.04]"
                    onClick={async () => {
                      await fetch("/api/integrations/github/disconnect", { method: "POST" });
                      window.location.href = "/dashboard/settings/integrations";
                    }}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <GithubOauthConnectButton
                  returnTo="/dashboard/settings/integrations"
                  label="Connect GitHub"
                  variant="glass"
                />
              )}
            </div>
          </div>
          {initial.github.connected ? (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-ink)]/60 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-[var(--color-bone)]">Repository Access Manager</p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-[var(--color-border)] bg-transparent text-[var(--color-bone)] hover:bg-white/[0.04]"
                    onClick={async () => {
                      setRepoActionMessage(null);
                      setRepoSaveBusy(true);
                      const response = await fetch("/api/integrations/github/refresh", { method: "POST" });
                      const json = (await response.json().catch(() => ({}))) as {
                        ok?: boolean;
                        error?: string;
                        syncedCount?: number;
                      };
                      setRepoSaveBusy(false);
                      if (!response.ok || !json.ok) {
                        setRepoActionMessage(json.error ?? "Refresh failed.");
                        return;
                      }
                      setRepoActionMessage(`Synced ${json.syncedCount ?? 0} repositories from GitHub.`);
                      window.location.reload();
                    }}
                  >
                    Refresh from GitHub
                  </Button>
                </div>
              </div>
              <div className="mb-3">
                <Input
                  value={repoSearch}
                  onChange={(event) => setRepoSearch(event.target.value)}
                  placeholder="Search repositories..."
                  className="h-10 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)]"
                />
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {filteredGithubRepos.map((repo) => {
                  const checked = selectedRepoIds.includes(repo.repoId);
                  return (
                    <label
                      key={repo.repoId}
                      className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-ink)]/60 px-3 py-2"
                    >
                      <span className="text-sm text-[var(--color-bone)]">{repo.fullName}</span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          setSelectedRepoIds((prev) =>
                            event.target.checked
                              ? [...prev, repo.repoId]
                              : prev.filter((id) => id !== repo.repoId),
                          );
                        }}
                        className="h-4 w-4 accent-[var(--color-amber)]"
                      />
                    </label>
                  );
                })}
                {filteredGithubRepos.length === 0 ? (
                  <p className="text-sm text-[var(--color-bone-faint)]">No repositories match this search.</p>
                ) : null}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-[var(--color-bone-faint)]">
                  {selectedRepoIds.length === 0
                    ? "No repos selected. Repo pickers will stay empty until you select at least one."
                    : `${selectedRepoIds.length} repositories selected.`}
                </p>
                <Button
                  type="button"
                  disabled={repoSaveBusy}
                  variant="glass"
                  className="rounded-full px-5"
                  onClick={async () => {
                    setRepoActionMessage(null);
                    setRepoSaveBusy(true);
                    const response = await fetch("/api/integrations/github/selection", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ repoIds: selectedRepoIds }),
                    });
                    const json = (await response.json().catch(() => ({}))) as {
                      ok?: boolean;
                      error?: string;
                    };
                    setRepoSaveBusy(false);
                    if (!response.ok || !json.ok) {
                      setRepoActionMessage(json.error ?? "Failed to save selected repositories.");
                      return;
                    }
                    setRepoActionMessage("Selected repositories saved.");
                    window.location.reload();
                  }}
                >
                  {repoSaveBusy ? "Saving..." : "Save selected repositories"}
                </Button>
              </div>
              {repoActionMessage ? (
                <p className="mt-2 text-xs text-[var(--color-bone-muted)]">{repoActionMessage}</p>
              ) : null}
            </div>
          ) : null}
        </SettingsCardContent>
      </SettingsCard>

      <SettingsCard className="rounded-2xl bg-[var(--color-ink-elevated)]/80 shadow-xl">
        <SettingsCardHeader>
          <SettingsCardTitle className="flex items-center gap-2 text-lg">
            <PlugZap className="h-4 w-4 text-[var(--color-amber)]" />
            AI Integrations
          </SettingsCardTitle>
          <SettingsCardDescription>
            Choose a default AI provider/model and manage provider credentials.
          </SettingsCardDescription>
        </SettingsCardHeader>
        <SettingsCardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <ConnectorCard
              title="OpenAI"
              subtitle="ChatGPT models"
              logoSrc="/ChatGPT%20logo.svg"
              fallback="O"
              connected={initial.hasOpenAiKey}
              active={activeAiConnector === "openai"}
              onOpen={() => {
                setActiveAiConnector("openai");
                setAiProvider("openai");
                const nextModels = modelsForProvider("openai");
                if (!nextModels.includes(aiModel)) setAiModel(nextModels[0] ?? "");
                setShowAiConfig(true);
              }}
            />
            <ConnectorCard
              title="Claude"
              subtitle="Anthropic models"
              logoSrc="/Claude%20logo.svg"
              fallback="C"
              connected={initial.hasClaudeKey}
              active={activeAiConnector === "claude"}
              onOpen={() => {
                setActiveAiConnector("claude");
                setAiProvider("claude");
                const nextModels = modelsForProvider("claude");
                if (!nextModels.includes(aiModel)) setAiModel(nextModels[0] ?? "");
                setShowAiConfig(true);
              }}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-ink)]/50 px-4 py-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-[var(--color-bone)]">Provider configuration</p>
              <p className="text-xs text-[var(--color-bone-faint)]">
                Simulated OAuth connect flow. Credentials are stored securely after save.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-[var(--color-border)] bg-transparent text-[var(--color-bone)] hover:bg-white/[0.04]"
              onClick={() => setShowAiConfig((prev) => !prev)}
            >
              {showAiConfig ? "Hide Config" : "Connect / Edit"}
            </Button>
          </div>

          {showAiConfig ? (
            <div className="grid gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-ink)]/60 p-4 md:grid-cols-2">
              <input type="hidden" id="aiProvider" name="aiProvider" value={aiProvider} />
              <div className="grid gap-2">
                <Label htmlFor="aiProviderMenu">Provider</Label>
                <div className="relative" ref={providerMenuRef}>
                  <button
                    id="aiProviderMenu"
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
                    <div className="absolute z-20 mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-ink-elevated)] p-1 shadow-xl">
                      {(["openai", "claude"] as const).map((provider) => {
                        const isSelected = provider === aiProvider;
                        return (
                          <button
                            key={provider}
                            type="button"
                            onClick={() => {
                              setAiProvider(provider);
                              setActiveAiConnector(provider);
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
            </div>
          ) : null}
        </SettingsCardContent>
      </SettingsCard>

      <SettingsCard className="rounded-2xl bg-[var(--color-ink-elevated)]/80 shadow-xl">
        <SettingsCardHeader>
          <SettingsCardTitle className="flex items-center gap-2 text-lg">
            <Database className="h-4 w-4 text-[var(--color-amber)]" />
            Vector Integrations
          </SettingsCardTitle>
          <SettingsCardDescription>
            Configure vector backend routing and connection endpoints.
          </SettingsCardDescription>
        </SettingsCardHeader>
        <SettingsCardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <ConnectorCard
              title="Vector Service"
              subtitle="External HTTP endpoint"
              fallback="VS"
              connected={initial.hasVectorServiceUrl}
              active={showVectorConfig}
              onOpen={() => setShowVectorConfig(true)}
            />
            <ConnectorCard
              title="Vector Database"
              subtitle="Postgres-backed storage"
              fallback="DB"
              connected={initial.hasVectorDatabaseUrl}
              active={showVectorConfig}
              onOpen={() => setShowVectorConfig(true)}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-ink)]/50 px-4 py-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-[var(--color-bone)]">Routing and endpoint configuration</p>
              <p className="text-xs text-[var(--color-bone-faint)]">
                Define deterministic primary/fallback order and endpoint URLs.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-[var(--color-border)] bg-transparent text-[var(--color-bone)] hover:bg-white/[0.04]"
              onClick={() => setShowVectorConfig((prev) => !prev)}
            >
              {showVectorConfig ? "Hide Config" : "Connect / Edit"}
            </Button>
          </div>
          {showVectorConfig ? (
            <div className="grid gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-ink)]/60 p-4 md:grid-cols-2">
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
            </div>
          ) : null}
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
        <SettingsCardContent className="grid gap-2 md:grid-cols-2">
          <SecretStatus label="OpenAI API key" present={initial.hasOpenAiKey} />
          <SecretStatus label="Claude API key" present={initial.hasClaudeKey} />
          <SecretStatus label="Vector service URL" present={initial.hasVectorServiceUrl} />
          <SecretStatus label="Vector DB URL" present={initial.hasVectorDatabaseUrl} />
        </SettingsCardContent>
      </SettingsCard>

      <SettingsCard className="sticky bottom-3 rounded-2xl border-[var(--color-border)] bg-[var(--color-ink-elevated)]/95 shadow-2xl backdrop-blur">
        <SettingsCardHeader>
          <SettingsCardTitle className="flex items-center gap-2 text-base">
            <Waypoints className="h-4 w-4 text-[var(--color-amber)]" />
            Save Integration Defaults
          </SettingsCardTitle>
          <SettingsCardDescription>Apply all connector and routing changes for this workspace.</SettingsCardDescription>
        </SettingsCardHeader>
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
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-[var(--color-border)] bg-transparent text-[var(--color-bone)] hover:bg-white/[0.04]"
              onClick={() => {
                setShowAiConfig(true);
                setShowVectorConfig(true);
              }}
            >
              Review All Fields
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
            <Button
              type="submit"
              disabled={pending}
              variant="glass"
              className="rounded-full px-6 disabled:opacity-70"
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
          </div>
        </SettingsCardFooter>
      </SettingsCard>
    </form>
  );
}
