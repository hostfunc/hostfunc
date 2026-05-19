"use client";

import { GithubOauthConnectButton } from "@/components/github/oauth-connect-button";
import { IntegrationRow } from "@/components/settings/integration-row";
import type { IntegrationStatus } from "@/components/settings/integration-status-badge";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Check, Database, Loader2, RefreshCw, Search, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { updateWorkspaceIntegrationsAction } from "../actions";

type GithubStatus =
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

type GithubRepo = {
  repoId: number;
  fullName: string;
  defaultBranch: string;
  private: boolean;
  archived: boolean;
};

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
    github: GithubStatus;
    githubRepos: GithubRepo[];
    githubSelectedRepoIds: number[];
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

function providerLabel(provider: "openai" | "claude"): string {
  return provider === "openai" ? "OpenAI" : "Claude";
}

function vectorBackendLabel(value: "external_http" | "postgres" | "none"): string {
  if (value === "external_http") return "External HTTP";
  if (value === "postgres") return "Postgres";
  return "None";
}

function ProviderIcon({ provider }: { provider: "openai" | "claude" }) {
  const src = provider === "openai" ? "/ChatGPT%20logo.svg" : "/Claude%20logo.svg";
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-white">
      <img src={src} alt="" className="h-full w-full object-cover" />
    </span>
  );
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className ?? "h-5 w-5 text-[var(--color-bone)]"}
      fill="currentColor"
    >
      <path d="M12 0.5C5.65 0.5 0.5 5.65 0.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-.99-.02-1.95-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.95 10.95 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.73.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.07.78 2.16 0 1.56-.01 2.81-.01 3.19 0 .31.21.68.8.56C20.21 21.39 23.5 17.08 23.5 12c0-6.35-5.15-11.5-11.5-11.5z" />
    </svg>
  );
}

type SheetKey = "ai" | "vector" | "github" | null;

export function IntegrationsClient({ initial }: Props) {
  const searchParams = useSearchParams();
  const [openSheet, setOpenSheet] = useState<SheetKey>(null);

  useEffect(() => {
    const githubState = searchParams.get("github");
    const githubReason = searchParams.get("reason");
    if (githubState === "connected") {
      toast.success("GitHub connected");
    } else if (githubState === "error") {
      toast.error("GitHub connection failed", {
        description: githubReason ?? undefined,
      });
    }
  }, [searchParams]);

  const aiStatus: IntegrationStatus =
    initial.hasOpenAiKey || initial.hasClaudeKey ? "configured" : "unconfigured";
  const vectorStatus: IntegrationStatus =
    initial.hasVectorServiceUrl || initial.hasVectorDatabaseUrl ? "configured" : "unconfigured";
  const githubStatus: IntegrationStatus = initial.github.connected ? "connected" : "disconnected";

  const configuredCount =
    (initial.hasOpenAiKey || initial.hasClaudeKey ? 1 : 0) +
    (initial.hasVectorServiceUrl || initial.hasVectorDatabaseUrl ? 1 : 0) +
    (initial.github.connected ? 1 : 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--color-bone-muted)]">
          {configuredCount === 3
            ? "All workspace integrations are configured."
            : `${configuredCount} of 3 workspace integrations configured.`}
        </p>
        <p className="text-xs text-[var(--color-bone-faint)]">
          These defaults apply to every function in this workspace.
        </p>
      </div>

      <div className="space-y-3">
        <IntegrationRow
          icon={<ProviderIcon provider={initial.aiProvider} />}
          title="AI Model"
          description={`${providerLabel(initial.aiProvider)} · ${initial.aiModel}`}
          helperText={
            initial.hasOpenAiKey && initial.hasClaudeKey
              ? "OpenAI and Claude keys configured"
              : initial.hasOpenAiKey
                ? "OpenAI key configured"
                : initial.hasClaudeKey
                  ? "Claude key configured"
                  : "No API keys configured"
          }
          status={aiStatus}
          onClick={() => setOpenSheet("ai")}
        />
        <IntegrationRow
          icon={<Database className="h-5 w-5 text-[var(--color-amber)]" />}
          title="Vector Backend"
          description={`${vectorBackendLabel(initial.vectorPrimary)} → ${vectorBackendLabel(initial.vectorSecondary)}`}
          helperText={
            initial.hasVectorServiceUrl && initial.hasVectorDatabaseUrl
              ? "Service URL and database URL set"
              : initial.hasVectorServiceUrl
                ? "Service URL set"
                : initial.hasVectorDatabaseUrl
                  ? "Database URL set"
                  : "No endpoints configured"
          }
          status={vectorStatus}
          onClick={() => setOpenSheet("vector")}
        />
        <IntegrationRow
          icon={<GithubIcon className="h-5 w-5 text-[var(--color-bone)]" />}
          title="GitHub"
          description={
            initial.github.connected
              ? `Connected as ${initial.github.accountLogin}`
              : "Not connected"
          }
          helperText={
            initial.github.connected
              ? `${initial.github.selectedRepoCount} of ${initial.github.repoCount} repositories selected`
              : "Connect to bind functions to repositories"
          }
          status={githubStatus}
          onClick={() => setOpenSheet("github")}
        />
      </div>

      <AiConfigSheet
        open={openSheet === "ai"}
        onOpenChange={(open) => setOpenSheet(open ? "ai" : null)}
        initial={initial}
      />
      <VectorConfigSheet
        open={openSheet === "vector"}
        onOpenChange={(open) => setOpenSheet(open ? "vector" : null)}
        initial={initial}
      />
      <GithubConnectSheet
        open={openSheet === "github"}
        onOpenChange={(open) => setOpenSheet(open ? "github" : null)}
        initial={initial}
      />
    </div>
  );
}

function AiConfigSheet({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: Props["initial"];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateWorkspaceIntegrationsAction,
    null,
  );
  const [aiProvider, setAiProvider] = useState<"openai" | "claude">(initial.aiProvider);
  const [aiModel, setAiModel] = useState(initial.aiModel);

  useEffect(() => {
    if (open) {
      setAiProvider(initial.aiProvider);
      setAiModel(initial.aiModel);
    }
  }, [open, initial.aiProvider, initial.aiModel]);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success("AI defaults saved", { description: state.message });
      onOpenChange(false);
    } else if (state.error?.form?.length) {
      toast.error("Failed to save AI defaults", {
        description: state.error.form.join("\n"),
      });
    }
  }, [state, onOpenChange]);

  const modelOptions = useMemo(() => {
    const base = modelsForProvider(aiProvider);
    return base.includes(aiModel) ? [...base] : [aiModel, ...base];
  }, [aiProvider, aiModel]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[var(--color-amber)]" />
            AI Model
          </SheetTitle>
          <SheetDescription>
            Pick the default provider and model for `@hostfunc/sdk/ai` and `@hostfunc/sdk/agent`.
            Empty key fields keep existing values.
          </SheetDescription>
        </SheetHeader>
        <form action={formAction} className="flex flex-1 flex-col">
          <SheetBody className="space-y-5">
            {/* Preserve vector settings on this save */}
            <input type="hidden" name="vectorPrimary" value={initial.vectorPrimary} />
            <input type="hidden" name="vectorSecondary" value={initial.vectorSecondary} />

            <div className="grid gap-2">
              <Label htmlFor="ws-aiProvider">Provider</Label>
              <CustomSelect
                id="ws-aiProvider"
                name="aiProvider"
                value={aiProvider}
                onChange={(value) => {
                  const next = value as "openai" | "claude";
                  setAiProvider(next);
                  const nextModels = modelsForProvider(next);
                  if (!nextModels.includes(aiModel)) setAiModel(nextModels[0] ?? "");
                }}
                options={[
                  {
                    value: "openai",
                    label: "OpenAI",
                    icon: <ProviderIcon provider="openai" />,
                  },
                  {
                    value: "claude",
                    label: "Claude",
                    icon: <ProviderIcon provider="claude" />,
                  },
                ]}
                renderValue={(option) => (
                  <span className="inline-flex items-center gap-2">
                    {option?.icon ?? null}
                    <span>{option?.label ?? "Select provider"}</span>
                  </span>
                )}
                renderOption={(option) => (
                  <span className="inline-flex items-center gap-2">
                    {option.icon ?? null}
                    <span>{option.label}</span>
                  </span>
                )}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ws-aiModel">Default model</Label>
              <CustomSelect
                id="ws-aiModel"
                name="aiModel"
                value={aiModel}
                onChange={(value) => setAiModel(value)}
                options={modelOptions.map((model) => ({ value: model, label: model }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ws-openaiApiKey">OpenAI API key</Label>
              <Input
                id="ws-openaiApiKey"
                name="openaiApiKey"
                type="password"
                autoComplete="off"
                placeholder={initial.openAiKeyPreview ?? "sk-..."}
                className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)]"
              />
              <p className="text-xs text-[var(--color-bone-faint)]">
                {initial.openAiKeyPreview
                  ? `Stored key: ${initial.openAiKeyPreview} · leave empty to keep`
                  : "No key on file."}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ws-claudeApiKey">Claude API key</Label>
              <Input
                id="ws-claudeApiKey"
                name="claudeApiKey"
                type="password"
                autoComplete="off"
                placeholder={initial.claudeKeyPreview ?? "sk-ant-..."}
                className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)]"
              />
              <p className="text-xs text-[var(--color-bone-faint)]">
                {initial.claudeKeyPreview
                  ? `Stored key: ${initial.claudeKeyPreview} · leave empty to keep`
                  : "No key on file."}
              </p>
            </div>
          </SheetBody>
          <SheetFooter>
            <Button type="submit" variant="glass" disabled={pending} className="rounded-full px-6">
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function VectorConfigSheet({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: Props["initial"];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateWorkspaceIntegrationsAction,
    null,
  );
  const [vectorPrimary, setVectorPrimary] = useState<"external_http" | "postgres">(
    initial.vectorPrimary,
  );
  const [vectorSecondary, setVectorSecondary] = useState<"external_http" | "postgres" | "none">(
    initial.vectorSecondary,
  );

  useEffect(() => {
    if (open) {
      setVectorPrimary(initial.vectorPrimary);
      setVectorSecondary(initial.vectorSecondary);
    }
  }, [open, initial.vectorPrimary, initial.vectorSecondary]);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success("Vector defaults saved", { description: state.message });
      onOpenChange(false);
    } else if (state.error?.form?.length) {
      toast.error("Failed to save vector defaults", {
        description: state.error.form.join("\n"),
      });
    }
  }, [state, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-[var(--color-amber)]" />
            Vector Backend
          </SheetTitle>
          <SheetDescription>
            Set deterministic primary and fallback routing for `@hostfunc/sdk/vector`. Empty URL
            fields keep stored values.
          </SheetDescription>
        </SheetHeader>
        <form action={formAction} className="flex flex-1 flex-col">
          <SheetBody className="space-y-5">
            {/* Preserve AI settings on this save */}
            <input type="hidden" name="aiProvider" value={initial.aiProvider} />
            <input type="hidden" name="aiModel" value={initial.aiModel} />

            <div className="grid gap-2">
              <Label htmlFor="ws-vectorPrimary">Primary backend</Label>
              <CustomSelect
                id="ws-vectorPrimary"
                name="vectorPrimary"
                value={vectorPrimary}
                onChange={(value) => setVectorPrimary(value as "external_http" | "postgres")}
                options={[
                  { value: "external_http", label: "External HTTP" },
                  { value: "postgres", label: "Postgres" },
                ]}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ws-vectorSecondary">Fallback backend</Label>
              <CustomSelect
                id="ws-vectorSecondary"
                name="vectorSecondary"
                value={vectorSecondary}
                onChange={(value) =>
                  setVectorSecondary(value as "external_http" | "postgres" | "none")
                }
                options={[
                  { value: "none", label: "None" },
                  { value: "external_http", label: "External HTTP" },
                  { value: "postgres", label: "Postgres" },
                ]}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ws-vectorServiceUrl">Vector service URL</Label>
              <Input
                id="ws-vectorServiceUrl"
                name="vectorServiceUrl"
                placeholder={initial.hasVectorServiceUrl ? "On file" : "https://vector.example.com"}
                className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)]"
              />
              <p className="text-xs text-[var(--color-bone-faint)]">
                {initial.hasVectorServiceUrl
                  ? "URL on file · leave empty to keep"
                  : "Not yet configured."}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ws-vectorDatabaseUrl">Vector database URL</Label>
              <Input
                id="ws-vectorDatabaseUrl"
                name="vectorDatabaseUrl"
                placeholder={initial.hasVectorDatabaseUrl ? "On file" : "postgres://..."}
                className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)]"
              />
              <p className="text-xs text-[var(--color-bone-faint)]">
                {initial.hasVectorDatabaseUrl
                  ? "URL on file · leave empty to keep"
                  : "Not yet configured."}
              </p>
            </div>
          </SheetBody>
          <SheetFooter>
            <Button type="submit" variant="glass" disabled={pending} className="rounded-full px-6">
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function GithubConnectSheet({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: Props["initial"];
}) {
  const [repoSearch, setRepoSearch] = useState("");
  const [selectedRepoIds, setSelectedRepoIds] = useState<number[]>(initial.githubSelectedRepoIds);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedRepoIds(initial.githubSelectedRepoIds);
      setRepoSearch("");
    }
  }, [open, initial.githubSelectedRepoIds]);

  const filteredRepos = useMemo(() => {
    const query = repoSearch.trim().toLowerCase();
    if (!query) return initial.githubRepos;
    return initial.githubRepos.filter((repo) => repo.fullName.toLowerCase().includes(query));
  }, [initial.githubRepos, repoSearch]);

  const selectionDirty = useMemo(() => {
    if (selectedRepoIds.length !== initial.githubSelectedRepoIds.length) return true;
    const sortedNew = [...selectedRepoIds].sort();
    const sortedOld = [...initial.githubSelectedRepoIds].sort();
    return sortedNew.some((id, idx) => id !== sortedOld[idx]);
  }, [selectedRepoIds, initial.githubSelectedRepoIds]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[560px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <GithubIcon className="h-5 w-5 text-[var(--color-bone)]" />
            GitHub
          </SheetTitle>
          <SheetDescription>
            Connect your workspace to GitHub and choose which repositories functions can bind to.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-ink)]/60 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[var(--color-bone)]">
                {initial.github.connected
                  ? `Connected as ${initial.github.accountLogin}`
                  : "Not connected"}
              </p>
              <p className="mt-0.5 text-xs text-[var(--color-bone-faint)]">
                {initial.github.connected
                  ? `${initial.github.repoCount} repositories visible to the install`
                  : "Authorize the GitHub app to manage repos."}
              </p>
            </div>
            {initial.github.connected ? (
              <Button
                type="button"
                variant="outline"
                disabled={disconnecting}
                className="border-[var(--color-border)] bg-transparent text-[var(--color-bone)] hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-200"
                onClick={async () => {
                  setDisconnecting(true);
                  try {
                    const response = await fetch("/api/integrations/github/disconnect", {
                      method: "POST",
                    });
                    if (!response.ok) {
                      toast.error("Failed to disconnect");
                      return;
                    }
                    toast.success("GitHub disconnected");
                    window.location.href = "/dashboard/settings/integrations";
                  } finally {
                    setDisconnecting(false);
                  }
                }}
              >
                {disconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Disconnect
              </Button>
            ) : (
              <GithubOauthConnectButton
                returnTo="/dashboard/settings/integrations"
                label="Connect GitHub"
                variant="glass"
                className="rounded-full px-5"
              />
            )}
          </div>

          {initial.github.connected ? (
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-[var(--color-bone)]">Repository access</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={refreshing}
                  className="border-[var(--color-border)] bg-transparent text-[var(--color-bone)] hover:bg-white/[0.04]"
                  onClick={async () => {
                    setRefreshing(true);
                    try {
                      const response = await fetch("/api/integrations/github/refresh", {
                        method: "POST",
                      });
                      const json = (await response.json().catch(() => ({}))) as {
                        ok?: boolean;
                        error?: string;
                        syncedCount?: number;
                      };
                      if (!response.ok || !json.ok) {
                        toast.error("Refresh failed", { description: json.error });
                        return;
                      }
                      toast.success(`Synced ${json.syncedCount ?? 0} repositories`);
                      window.location.reload();
                    } finally {
                      setRefreshing(false);
                    }
                  }}
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Refresh
                </Button>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-bone-faint)]" />
                <Input
                  value={repoSearch}
                  onChange={(event) => setRepoSearch(event.target.value)}
                  placeholder="Search repositories..."
                  className="h-10 pl-9 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)]"
                />
              </div>

              <div className="max-h-[320px] space-y-1.5 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-ink)]/40 p-2">
                {filteredRepos.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-[var(--color-bone-faint)]">
                    {repoSearch
                      ? "No repositories match this search."
                      : "No repositories visible to the install."}
                  </p>
                ) : (
                  filteredRepos.map((repo) => {
                    const checked = selectedRepoIds.includes(repo.repoId);
                    return (
                      <button
                        key={repo.repoId}
                        type="button"
                        onClick={() => {
                          setSelectedRepoIds((prev) =>
                            checked
                              ? prev.filter((id) => id !== repo.repoId)
                              : [...prev, repo.repoId],
                          );
                        }}
                        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                          checked
                            ? "bg-[var(--color-amber)]/12 text-[var(--color-bone)]"
                            : "text-[var(--color-bone-muted)] hover:bg-white/[0.04] hover:text-[var(--color-bone)]"
                        }`}
                      >
                        <span className="inline-flex items-center gap-2 truncate">
                          <span className="truncate font-medium">{repo.fullName}</span>
                          {repo.private ? (
                            <span className="rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--color-bone-faint)]">
                              private
                            </span>
                          ) : null}
                          {repo.archived ? (
                            <span className="rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--color-bone-faint)]">
                              archived
                            </span>
                          ) : null}
                        </span>
                        {checked ? (
                          <Check className="h-4 w-4 shrink-0 text-[var(--color-amber)]" />
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
              <p className="text-xs text-[var(--color-bone-faint)]">
                {selectedRepoIds.length === 0
                  ? "Nothing selected. Function repo pickers will be empty."
                  : `${selectedRepoIds.length} repository${selectedRepoIds.length === 1 ? "" : "ies"} selected.`}
              </p>
            </div>
          ) : null}
        </SheetBody>
        {initial.github.connected ? (
          <SheetFooter>
            <Button
              type="button"
              variant="glass"
              disabled={saving || !selectionDirty}
              className="rounded-full px-6"
              onClick={async () => {
                setSaving(true);
                try {
                  const response = await fetch("/api/integrations/github/selection", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ repoIds: selectedRepoIds }),
                  });
                  const json = (await response.json().catch(() => ({}))) as {
                    ok?: boolean;
                    error?: string;
                  };
                  if (!response.ok || !json.ok) {
                    toast.error("Failed to save selection", { description: json.error });
                    return;
                  }
                  toast.success("Selected repositories saved");
                  window.location.reload();
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save selection"
              )}
            </Button>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
