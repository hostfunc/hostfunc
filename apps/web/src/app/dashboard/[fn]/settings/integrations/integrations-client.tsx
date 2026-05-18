"use client";

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
import { Database, GitBranch, Loader2, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  clearFunctionIntegrationOverridesAction,
  listFunctionGithubBranches,
  removeFunctionGithubBindingAction,
  saveFunctionGithubBindingAction,
  updateFunctionIntegrationOverridesStateAction,
} from "../../actions";

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

type GithubRepo = {
  repoId: number;
  fullName: string;
  defaultBranch: string;
  ownerAvatarUrl: string;
};

type GithubBinding = {
  repoId: number;
  repoFullName: string;
  branch: string;
  pathPrefix: string | null;
};

type Props = {
  fnId: string;
  initial: {
    hasSavedFnOverrides: boolean;
    workspace: WorkspaceSummary;
    overrides: OverrideFormInitial;
    github: {
      connected: boolean;
      repos: GithubRepo[];
      binding: GithubBinding | null;
    };
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

function ProviderIcon({
  provider,
  className,
}: { provider: "openai" | "claude"; className?: string }) {
  const src = provider === "openai" ? "/ChatGPT%20logo.svg" : "/Claude%20logo.svg";
  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-white ${className ?? ""}`}
    >
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

export function FunctionIntegrationsClient({ fnId, initial }: Props) {
  const [openSheet, setOpenSheet] = useState<SheetKey>(null);

  const hasAiOverride =
    initial.overrides.aiProvider !== "" ||
    initial.overrides.aiModel !== "" ||
    initial.overrides.hasOpenAiKey ||
    initial.overrides.hasClaudeKey;

  const hasVectorOverride =
    initial.overrides.vectorPrimary !== "" ||
    initial.overrides.vectorSecondary !== "" ||
    initial.overrides.hasVectorServiceUrl ||
    initial.overrides.hasVectorDatabaseUrl;

  const hasGithubBinding = initial.github.binding !== null;

  const effectiveAiProvider = (initial.overrides.aiProvider || initial.workspace.aiProvider) as
    | "openai"
    | "claude";
  const effectiveAiModel = initial.overrides.aiModel || initial.workspace.aiModel;

  const effectiveVectorPrimary = (initial.overrides.vectorPrimary ||
    initial.workspace.vectorPrimary) as "external_http" | "postgres";
  const effectiveVectorSecondary = (initial.overrides.vectorSecondary ||
    initial.workspace.vectorSecondary) as "external_http" | "postgres" | "none";

  const overrideCount = [hasAiOverride, hasVectorOverride].filter(Boolean).length;

  const aiStatus: IntegrationStatus = hasAiOverride ? "custom" : "inherited";
  const vectorStatus: IntegrationStatus = hasVectorOverride ? "custom" : "inherited";
  const githubStatus: IntegrationStatus = !initial.github.connected
    ? "disconnected"
    : hasGithubBinding
      ? "connected"
      : "unconfigured";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--color-bone-muted)]">
          {overrideCount === 0
            ? "This function uses workspace defaults for AI and vector integrations."
            : overrideCount === 1
              ? "1 integration has a function-level override."
              : "2 integrations have function-level overrides."}
        </p>
        <Link
          href="/dashboard/settings/integrations"
          className="text-sm text-[var(--color-bone)] underline-offset-4 hover:text-[var(--color-amber)] hover:underline"
        >
          Edit workspace defaults →
        </Link>
      </div>

      <div className="space-y-3">
        <IntegrationRow
          icon={<ProviderIcon provider={effectiveAiProvider} />}
          title="AI Model"
          description={`${providerLabel(effectiveAiProvider)} · ${effectiveAiModel}`}
          helperText={
            hasAiOverride
              ? "Function override active"
              : `Using workspace default · ${providerLabel(initial.workspace.aiProvider)} ${initial.workspace.aiModel}`
          }
          status={aiStatus}
          onClick={() => setOpenSheet("ai")}
        />
        <IntegrationRow
          icon={<Database className="h-5 w-5 text-[var(--color-amber)]" />}
          title="Vector Backend"
          description={`${vectorBackendLabel(effectiveVectorPrimary)} → ${vectorBackendLabel(effectiveVectorSecondary)}`}
          helperText={
            hasVectorOverride
              ? "Function override active"
              : `Using workspace default · ${vectorBackendLabel(initial.workspace.vectorPrimary)} → ${vectorBackendLabel(initial.workspace.vectorSecondary)}`
          }
          status={vectorStatus}
          onClick={() => setOpenSheet("vector")}
        />
        <IntegrationRow
          icon={<GithubIcon className="h-5 w-5 text-[var(--color-bone)]" />}
          title="GitHub Repository"
          description={
            initial.github.binding
              ? `${initial.github.binding.repoFullName} @ ${initial.github.binding.branch}`
              : initial.github.connected
                ? "No repository bound"
                : "Workspace not connected"
          }
          helperText={
            initial.github.binding?.pathPrefix
              ? `Path: ${initial.github.binding.pathPrefix}`
              : undefined
          }
          status={githubStatus}
          onClick={() => setOpenSheet("github")}
        />
      </div>

      <AiOverrideSheet
        open={openSheet === "ai"}
        onOpenChange={(open) => setOpenSheet(open ? "ai" : null)}
        fnId={fnId}
        workspace={initial.workspace}
        overrides={initial.overrides}
      />
      <VectorOverrideSheet
        open={openSheet === "vector"}
        onOpenChange={(open) => setOpenSheet(open ? "vector" : null)}
        fnId={fnId}
        workspace={initial.workspace}
        overrides={initial.overrides}
      />
      <GithubBindingSheet
        open={openSheet === "github"}
        onOpenChange={(open) => setOpenSheet(open ? "github" : null)}
        fnId={fnId}
        github={initial.github}
      />
    </div>
  );
}

function AiOverrideSheet({
  open,
  onOpenChange,
  fnId,
  workspace,
  overrides,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fnId: string;
  workspace: WorkspaceSummary;
  overrides: OverrideFormInitial;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateFunctionIntegrationOverridesStateAction,
    null,
  );
  const [aiProvider, setAiProvider] = useState<"" | "openai" | "claude">(overrides.aiProvider);
  const [aiModel, setAiModel] = useState(overrides.aiModel);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (open) {
      setAiProvider(overrides.aiProvider);
      setAiModel(overrides.aiModel);
    }
  }, [open, overrides.aiProvider, overrides.aiModel]);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success("AI overrides saved", { description: state.message });
      onOpenChange(false);
    } else if (state.error?.form?.length) {
      toast.error("Failed to save AI overrides", {
        description: state.error.form.join("\n"),
      });
    }
  }, [state, onOpenChange]);

  const providerOptions = useMemo(
    () => [
      { value: "", label: `Workspace default (${providerLabel(workspace.aiProvider)})` },
      { value: "openai", label: "OpenAI" },
      { value: "claude", label: "Claude" },
    ],
    [workspace.aiProvider],
  );

  const modelOptions = useMemo(() => {
    if (aiProvider === "") {
      return [{ value: "", label: `Workspace default (${workspace.aiModel})` }];
    }
    const base = modelsForProvider(aiProvider);
    const list = aiModel && !base.includes(aiModel) ? [aiModel, ...base] : [...base];
    return [
      { value: "", label: `Workspace default (${workspace.aiModel})` },
      ...list.map((m) => ({ value: m, label: m })),
    ];
  }, [aiProvider, aiModel, workspace.aiModel]);

  const hasAnyOverride =
    overrides.aiProvider !== "" ||
    overrides.aiModel !== "" ||
    overrides.hasOpenAiKey ||
    overrides.hasClaudeKey;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[var(--color-amber)]" />
            AI Model
          </SheetTitle>
          <SheetDescription>
            Override the AI provider, model, or credentials for this function. Leave a field on
            “Workspace default” to inherit from the workspace.
          </SheetDescription>
        </SheetHeader>
        <form action={formAction} className="flex flex-1 flex-col">
          <SheetBody className="space-y-5">
            <input type="hidden" name="fnId" value={fnId} />
            {/* Preserve vector overrides on save */}
            <input type="hidden" name="vectorPrimary" value={overrides.vectorPrimary} />
            <input type="hidden" name="vectorSecondary" value={overrides.vectorSecondary} />

            <div className="grid gap-2">
              <Label htmlFor="fn-aiProvider">Provider</Label>
              <CustomSelect
                id="fn-aiProvider"
                name="aiProvider"
                value={aiProvider}
                onChange={(value) => {
                  const next = value as "" | "openai" | "claude";
                  setAiProvider(next);
                  if (next === "") {
                    setAiModel("");
                  } else {
                    const nextModels = modelsForProvider(next);
                    if (!nextModels.includes(aiModel)) setAiModel("");
                  }
                }}
                options={providerOptions}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fn-aiModel">Model</Label>
              <CustomSelect
                id="fn-aiModel"
                name="aiModel"
                value={aiModel}
                onChange={(value) => setAiModel(value)}
                options={modelOptions}
                disabled={aiProvider === ""}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fn-openaiApiKey">OpenAI API key</Label>
              <Input
                id="fn-openaiApiKey"
                name="openaiApiKey"
                type="password"
                autoComplete="off"
                placeholder={overrides.openAiKeyPreview ?? "sk-..."}
                className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)]"
              />
              <p className="text-xs text-[var(--color-bone-faint)]">
                {overrides.openAiKeyPreview
                  ? `Override on file: ${overrides.openAiKeyPreview} · leave empty to keep`
                  : workspace.hasOpenAiKey
                    ? "Inheriting workspace key. Enter a key to override."
                    : "No workspace key set."}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fn-claudeApiKey">Claude API key</Label>
              <Input
                id="fn-claudeApiKey"
                name="claudeApiKey"
                type="password"
                autoComplete="off"
                placeholder={overrides.claudeKeyPreview ?? "sk-ant-..."}
                className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)]"
              />
              <p className="text-xs text-[var(--color-bone-faint)]">
                {overrides.claudeKeyPreview
                  ? `Override on file: ${overrides.claudeKeyPreview} · leave empty to keep`
                  : workspace.hasClaudeKey
                    ? "Inheriting workspace key. Enter a key to override."
                    : "No workspace key set."}
              </p>
            </div>
          </SheetBody>
          <SheetFooter>
            {hasAnyOverride ? (
              <Button
                type="button"
                variant="outline"
                disabled={resetting || pending}
                className="border-[var(--color-border)] bg-transparent text-[var(--color-bone)] hover:bg-white/[0.04]"
                onClick={async () => {
                  setResetting(true);
                  try {
                    await clearFunctionIntegrationOverridesAction({ fnId, scope: "ai" });
                    toast.success("Reset to workspace default");
                    onOpenChange(false);
                  } catch (error) {
                    toast.error("Failed to reset", {
                      description: error instanceof Error ? error.message : undefined,
                    });
                  } finally {
                    setResetting(false);
                  }
                }}
              >
                {resetting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                Reset to workspace default
              </Button>
            ) : null}
            <div className="flex-1" />
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

function VectorOverrideSheet({
  open,
  onOpenChange,
  fnId,
  workspace,
  overrides,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fnId: string;
  workspace: WorkspaceSummary;
  overrides: OverrideFormInitial;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateFunctionIntegrationOverridesStateAction,
    null,
  );
  const [vectorPrimary, setVectorPrimary] = useState<"" | "external_http" | "postgres">(
    overrides.vectorPrimary,
  );
  const [vectorSecondary, setVectorSecondary] = useState<
    "" | "none" | "external_http" | "postgres"
  >(overrides.vectorSecondary);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (open) {
      setVectorPrimary(overrides.vectorPrimary);
      setVectorSecondary(overrides.vectorSecondary);
    }
  }, [open, overrides.vectorPrimary, overrides.vectorSecondary]);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success("Vector overrides saved", { description: state.message });
      onOpenChange(false);
    } else if (state.error?.form?.length) {
      toast.error("Failed to save vector overrides", {
        description: state.error.form.join("\n"),
      });
    }
  }, [state, onOpenChange]);

  const hasAnyOverride =
    overrides.vectorPrimary !== "" ||
    overrides.vectorSecondary !== "" ||
    overrides.hasVectorServiceUrl ||
    overrides.hasVectorDatabaseUrl;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-[var(--color-amber)]" />
            Vector Backend
          </SheetTitle>
          <SheetDescription>
            Override deterministic primary/fallback routing or service endpoints for this function.
            Leave a field on “Workspace default” to inherit.
          </SheetDescription>
        </SheetHeader>
        <form action={formAction} className="flex flex-1 flex-col">
          <SheetBody className="space-y-5">
            <input type="hidden" name="fnId" value={fnId} />
            {/* Preserve AI overrides on save */}
            <input type="hidden" name="aiProvider" value={overrides.aiProvider} />
            <input type="hidden" name="aiModel" value={overrides.aiModel} />

            <div className="grid gap-2">
              <Label htmlFor="fn-vectorPrimary">Primary backend</Label>
              <CustomSelect
                id="fn-vectorPrimary"
                name="vectorPrimary"
                value={vectorPrimary}
                onChange={(value) => setVectorPrimary(value as "" | "external_http" | "postgres")}
                options={[
                  {
                    value: "",
                    label: `Workspace default (${vectorBackendLabel(workspace.vectorPrimary)})`,
                  },
                  { value: "external_http", label: "External HTTP" },
                  { value: "postgres", label: "Postgres" },
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
                  {
                    value: "",
                    label: `Workspace default (${vectorBackendLabel(workspace.vectorSecondary)})`,
                  },
                  { value: "none", label: "None" },
                  { value: "external_http", label: "External HTTP" },
                  { value: "postgres", label: "Postgres" },
                ]}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fn-vectorServiceUrl">Vector service URL</Label>
              <Input
                id="fn-vectorServiceUrl"
                name="vectorServiceUrl"
                placeholder="https://vector.example.com"
                className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)]"
              />
              <p className="text-xs text-[var(--color-bone-faint)]">
                {overrides.hasVectorServiceUrl
                  ? "Override on file · leave empty to keep"
                  : workspace.hasVectorServiceUrl
                    ? "Inheriting workspace URL. Enter to override."
                    : "No workspace URL set."}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fn-vectorDatabaseUrl">Vector database URL</Label>
              <Input
                id="fn-vectorDatabaseUrl"
                name="vectorDatabaseUrl"
                placeholder="postgres://..."
                className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)]"
              />
              <p className="text-xs text-[var(--color-bone-faint)]">
                {overrides.hasVectorDatabaseUrl
                  ? "Override on file · leave empty to keep"
                  : workspace.hasVectorDatabaseUrl
                    ? "Inheriting workspace URL. Enter to override."
                    : "No workspace URL set."}
              </p>
            </div>
          </SheetBody>
          <SheetFooter>
            {hasAnyOverride ? (
              <Button
                type="button"
                variant="outline"
                disabled={resetting || pending}
                className="border-[var(--color-border)] bg-transparent text-[var(--color-bone)] hover:bg-white/[0.04]"
                onClick={async () => {
                  setResetting(true);
                  try {
                    await clearFunctionIntegrationOverridesAction({ fnId, scope: "vector" });
                    toast.success("Reset to workspace default");
                    onOpenChange(false);
                  } catch (error) {
                    toast.error("Failed to reset", {
                      description: error instanceof Error ? error.message : undefined,
                    });
                  } finally {
                    setResetting(false);
                  }
                }}
              >
                {resetting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                Reset to workspace default
              </Button>
            ) : null}
            <div className="flex-1" />
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

function GithubBindingSheet({
  open,
  onOpenChange,
  fnId,
  github,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fnId: string;
  github: { connected: boolean; repos: GithubRepo[]; binding: GithubBinding | null };
}) {
  const [selectedRepoId, setSelectedRepoId] = useState<number | "">(github.binding?.repoId ?? "");
  const [selectedBranch, setSelectedBranch] = useState(github.binding?.branch ?? "");
  const [pathPrefix, setPathPrefix] = useState(github.binding?.pathPrefix ?? "");
  const [branches, setBranches] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedRepoId(github.binding?.repoId ?? "");
      setSelectedBranch(github.binding?.branch ?? "");
      setPathPrefix(github.binding?.pathPrefix ?? "");
    }
  }, [open, github.binding]);

  useEffect(() => {
    if (selectedRepoId === "") {
      setBranches([]);
      return;
    }
    let canceled = false;
    void (async () => {
      try {
        const data = await listFunctionGithubBranches({ fnId, repoId: selectedRepoId });
        if (canceled) return;
        setBranches(data);
        if (!selectedBranch && data.length > 0) setSelectedBranch(data[0] ?? "");
      } catch (error) {
        if (canceled) return;
        toast.error("Failed to load branches", {
          description: error instanceof Error ? error.message : undefined,
        });
      }
    })();
    return () => {
      canceled = true;
    };
  }, [fnId, selectedRepoId, selectedBranch]);

  const canSave =
    github.connected && selectedRepoId !== "" && selectedBranch !== "" && !busy && !removing;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <GithubIcon className="h-5 w-5 text-[var(--color-bone)]" />
            GitHub Repository
          </SheetTitle>
          <SheetDescription>
            Bind this function to a repository and branch. Source pulls and PR workflows target the
            binding.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-5">
          {!github.connected ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              <p className="font-medium">GitHub is not connected for this workspace.</p>
              <p className="mt-1 text-xs text-amber-200/80">
                Connect GitHub at the workspace level first, then return here to bind a repository.
              </p>
              <Link
                href="/dashboard/settings/integrations"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-amber-100 underline-offset-4 hover:underline"
              >
                Open workspace integrations →
              </Link>
            </div>
          ) : github.repos.length === 0 ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              <p className="font-medium">No repositories selected for this workspace.</p>
              <p className="mt-1 text-xs text-amber-200/80">
                Select at least one repository in workspace integrations settings to enable binding
                here.
              </p>
              <Link
                href="/dashboard/settings/integrations"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-amber-100 underline-offset-4 hover:underline"
              >
                Manage workspace repositories →
              </Link>
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="fn-githubRepo">Repository</Label>
                <CustomSelect
                  id="fn-githubRepo"
                  value={selectedRepoId === "" ? "" : String(selectedRepoId)}
                  onChange={(value) => {
                    setSelectedRepoId(value ? Number(value) : "");
                    setSelectedBranch("");
                  }}
                  placeholder="Select repository"
                  options={[
                    { value: "", label: "Select repository" },
                    ...github.repos.map((repo) => ({
                      value: String(repo.repoId),
                      label: repo.fullName,
                      icon: (
                        <img
                          src={repo.ownerAvatarUrl}
                          alt=""
                          aria-hidden="true"
                          className="h-4 w-4 rounded-full object-cover"
                        />
                      ),
                    })),
                  ]}
                  renderValue={(option) => (
                    <span className="inline-flex items-center gap-2">
                      {option?.icon ?? null}
                      <span className="truncate">{option?.label ?? "Select repository"}</span>
                    </span>
                  )}
                  renderOption={(option) => (
                    <span className="inline-flex items-center gap-2">
                      {option.icon ?? null}
                      <span className="truncate">{option.label}</span>
                    </span>
                  )}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="fn-githubBranch">Branch</Label>
                <CustomSelect
                  id="fn-githubBranch"
                  value={selectedBranch}
                  onChange={(value) => setSelectedBranch(value)}
                  disabled={selectedRepoId === ""}
                  options={[
                    {
                      value: "",
                      label:
                        selectedRepoId === ""
                          ? "Select repository first"
                          : branches.length === 0
                            ? "Loading branches..."
                            : "Select branch",
                    },
                    ...branches.map((branch) => ({
                      value: branch,
                      label: branch,
                      icon: <GitBranch className="h-3.5 w-3.5" />,
                    })),
                  ]}
                  renderValue={(option) => (
                    <span className="inline-flex items-center gap-2">
                      {option?.icon ?? null}
                      <span className="truncate">{option?.label ?? "Select branch"}</span>
                    </span>
                  )}
                  renderOption={(option) => (
                    <span className="inline-flex items-center gap-2">
                      {option.icon ?? null}
                      <span className="truncate">{option.label}</span>
                    </span>
                  )}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="fn-pathPrefix">Path prefix (optional)</Label>
                <Input
                  id="fn-pathPrefix"
                  value={pathPrefix}
                  onChange={(event) => setPathPrefix(event.target.value)}
                  placeholder="functions/my-function"
                  className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)]"
                />
                <p className="text-xs text-[var(--color-bone-faint)]">
                  Only files under this path are considered part of this function.
                </p>
              </div>
            </>
          )}
        </SheetBody>
        <SheetFooter>
          {github.binding ? (
            <Button
              type="button"
              variant="outline"
              disabled={removing || busy}
              className="border-[var(--color-border)] bg-transparent text-[var(--color-bone)] hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-200"
              onClick={async () => {
                setRemoving(true);
                try {
                  await removeFunctionGithubBindingAction(fnId);
                  setSelectedRepoId("");
                  setSelectedBranch("");
                  setPathPrefix("");
                  toast.success("GitHub binding removed");
                  onOpenChange(false);
                } catch (error) {
                  toast.error("Failed to remove binding", {
                    description: error instanceof Error ? error.message : undefined,
                  });
                } finally {
                  setRemoving(false);
                }
              }}
            >
              {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Remove binding
            </Button>
          ) : null}
          <div className="flex-1" />
          <Button
            type="button"
            variant="glass"
            disabled={!canSave}
            className="rounded-full px-6"
            onClick={async () => {
              if (selectedRepoId === "" || !selectedBranch) return;
              setBusy(true);
              try {
                await saveFunctionGithubBindingAction({
                  fnId,
                  repoId: selectedRepoId,
                  branch: selectedBranch,
                  pathPrefix: pathPrefix.trim() || undefined,
                });
                toast.success("GitHub binding saved");
                onOpenChange(false);
              } catch (error) {
                toast.error("Failed to save binding", {
                  description: error instanceof Error ? error.message : undefined,
                });
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save binding"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
