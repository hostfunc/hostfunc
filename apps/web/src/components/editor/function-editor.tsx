"use client";

import { saveDraft } from "@/app/dashboard/[fn]/actions";
import { generateCodeFromPrompt } from "@/app/dashboard/[fn]/actions";
import { Button } from "@/components/ui/button";
import { Bot, SearchCheck, SlidersHorizontal, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DeployButton } from "./deploy-button";
import { EditorExecutionPane } from "./execution-pane";
import { MonacoDiffEditor, MonacoEditor } from "./monaco-editor";
import { RunButton } from "./run-button";

interface Props {
  fnId: string;
  initialCode: string;
  packageNames: string[];
  readOnly?: boolean;
}

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

export function FunctionEditor({ fnId, initialCode, packageNames, readOnly = false }: Props) {
  const [code, setCode] = useState(initialCode);
  const [savedCode, setSavedCode] = useState(initialCode);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiProvider, setAiProvider] = useState<"openai" | "claude">("openai");
  const [aiModel, setAiModel] = useState("gpt-4o-mini");
  const [useLiveLookup, setUseLiveLookup] = useState(true);
  const [lookupHints, setLookupHints] = useState("discord.com, api.slack.com, docs.aws.amazon.com");
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [pendingGeneratedCode, setPendingGeneratedCode] = useState<string | null>(null);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  const persist = useCallback(
    async (next: string) => {
      try {
        await saveDraft({ fnId, code: next });
        setSavedCode(next);
      } catch (e) {
        toast.error("Failed to save draft");
        console.error(e);
      }
    },
    [fnId],
  );

  // Debounced auto-save
  useEffect(() => {
    if (code === savedCode) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(code), 1500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [code, savedCode, persist]);

  const dirty = code !== savedCode;
  const canGenerate = aiPrompt.trim().length >= 8 && aiModel.trim().length >= 1 && !isGenerating;
  const hasPendingDiff = pendingGeneratedCode !== null;

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setGenerationError(null);
      const result = await generateCodeFromPrompt({
        fnId,
        prompt: aiPrompt.trim(),
        provider: aiProvider,
        model: aiModel.trim(),
        useLiveLookup,
        lookupHints: lookupHints
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      });
      setPendingGeneratedCode(result.code);
      toast.success("Code generated. Review and accept changes.");
      setShowAiPanel(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate code";
      setGenerationError(message);
      toast.error("Failed to generate code", { description: message });
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const acceptGeneratedCode = async () => {
    if (!pendingGeneratedCode) return;
    setCode(pendingGeneratedCode);
    await persist(pendingGeneratedCode);
    setPendingGeneratedCode(null);
    toast.success("AI changes applied");
  };

  const revertGeneratedCode = () => {
    setPendingGeneratedCode(null);
    toast.message("AI changes discarded");
  };

  return (
    <div className="flex h-full flex-col bg-[#0d1117] overflow-hidden">
      {/* Editor Header Bar */}
      <div className="flex items-center justify-between border-b border-white/5 bg-[#161b22] px-4 py-3 relative z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center h-5">
            {dirty ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
              </span>
            ) : (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            )}
          </div>
          <span className="text-xs font-mono text-muted-foreground tracking-tight">
            {dirty ? "unsaved changes" : "synced"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground mr-2 font-mono opacity-60">
            {readOnly ? "read-only" : "⌘S to save"}
          </span>
          {!readOnly ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowAiPanel((prev) => !prev)}
                className="h-8 border-violet-500/35 bg-violet-500/12 text-violet-100 hover:bg-violet-500/22"
              >
                <Sparkles className="size-4" />
                {showAiPanel ? "Hide AI" : "AI Generate"}
              </Button>
              <RunButton fnId={fnId} currentCode={code} />
              <DeployButton fnId={fnId} onDeploy={() => persist(code)} />
            </>
          ) : null}
        </div>
      </div>

      {hasPendingDiff ? (
        <div className="border-b border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-emerald-200">
              AI generated a patch. Review diff, then accept or discard.
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={revertGeneratedCode}
                className="border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/20"
              >
                Revert
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void acceptGeneratedCode()}
                className="bg-emerald-500 text-black hover:bg-emerald-400"
              >
                Accept Diff
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {showAiPanel && !readOnly ? (
        <div className="border-b border-white/10 bg-[#0f141d] px-4 py-4">
          <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-slate-900/70 to-slate-950/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/15 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-violet-200">
                  <Bot className="size-3" />
                  AI Generator
                </div>
                <p className="mt-2 text-xs text-slate-300">
                  Generate production-ready Hostfunc code with SDK-aware context and optional live docs lookup.
                </p>
              </div>
              <div className="hidden items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-slate-300 md:flex">
                <SlidersHorizontal className="size-3.5 text-slate-400" />
                {aiProvider} · {aiModel}
              </div>
            </div>

            <div className="mb-3 grid gap-3 md:grid-cols-2">
              <div className="grid gap-1">
                <label htmlFor="aiGeneratorProvider" className="text-xs font-medium text-slate-300">
                  Provider
                </label>
                <div id="aiGeneratorProvider" className="grid h-10 grid-cols-2 gap-2">
                  <button
                    type="button"
                    aria-pressed={aiProvider === "openai"}
                    onClick={() => {
                      if (aiProvider === "openai") return;
                      const nextModels = modelsForProvider("openai");
                      setAiProvider("openai");
                      setAiModel(nextModels[0] ?? "");
                    }}
                    className={`rounded-md border px-3 text-sm transition ${
                      aiProvider === "openai"
                        ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-100"
                        : "border-white/15 bg-[#0b0f15] text-slate-300 hover:border-white/30"
                    }`}
                  >
                    OpenAI
                  </button>
                  <button
                    type="button"
                    aria-pressed={aiProvider === "claude"}
                    onClick={() => {
                      if (aiProvider === "claude") return;
                      const nextModels = modelsForProvider("claude");
                      setAiProvider("claude");
                      setAiModel(nextModels[0] ?? "");
                    }}
                    className={`rounded-md border px-3 text-sm transition ${
                      aiProvider === "claude"
                        ? "border-amber-400/60 bg-amber-500/15 text-amber-100"
                        : "border-white/15 bg-[#0b0f15] text-slate-300 hover:border-white/30"
                    }`}
                  >
                    Claude
                  </button>
                </div>
              </div>
              <div className="grid gap-1">
                <label htmlFor="aiGeneratorModel" className="text-xs font-medium text-slate-300">
                  Model
                </label>
                <select
                  id="aiGeneratorModel"
                  value={aiModel}
                  onChange={(event) => setAiModel(event.target.value)}
                  className="h-10 rounded-md border border-white/15 bg-[#0b0f15] px-3 text-sm text-slate-200 outline-none ring-violet-400/50 focus:ring-2"
                >
                  {modelsForProvider(aiProvider).map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="aiPromptInput" className="text-xs font-medium text-slate-300">
                Prompt
              </label>
              <textarea
                id="aiPromptInput"
                value={aiPrompt}
                onChange={(event) => setAiPrompt(event.target.value)}
                placeholder="Describe what function you want (inputs, outputs, integrations, edge cases, error handling)..."
                className="min-h-24 w-full resize-y rounded-md border border-white/15 bg-[#0b0f15] p-3 text-sm text-slate-200 outline-none ring-violet-400/50 focus:ring-2"
              />
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={useLiveLookup}
                  onChange={(event) => setUseLiveLookup(event.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-[#0b0f15] accent-cyan-400"
                />
                <SearchCheck className="size-3.5 text-cyan-300" />
                Use live docs lookup
              </label>
              <div className="grid gap-1">
                <label htmlFor="aiLookupHints" className="text-xs font-medium text-slate-300">
                  Lookup domains (comma-separated)
                </label>
                <input
                  id="aiLookupHints"
                  value={lookupHints}
                  onChange={(event) => setLookupHints(event.target.value)}
                  className="h-9 rounded-md border border-white/15 bg-[#0b0f15] px-3 text-xs text-slate-200 outline-none ring-cyan-400/50 focus:ring-2"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Output opens as a Monaco diff so you can accept or revert safely.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => void handleGenerate()}
                disabled={!canGenerate}
                className="h-8 bg-violet-500 text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Sparkles className="size-4" />
                {isGenerating ? "Generating..." : "Generate Code"}
              </Button>
            </div>

            {generationError ? (
              <div className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {generationError}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Editor Area */}
      <div className="flex-1 relative min-h-0 border-b border-white/5">
        {hasPendingDiff ? (
          <MonacoDiffEditor
            originalValue={code}
            modifiedValue={pendingGeneratedCode}
            packageNames={packageNames}
          />
        ) : (
          <MonacoEditor
            value={code}
            packageNames={packageNames}
            onChange={readOnly ? () => {} : setCode}
            {...(!readOnly ? { onSave: () => persist(code) } : {})}
            readOnly={readOnly}
          />
        )}
      </div>

      <EditorExecutionPane fnId={fnId} />
    </div>
  );
}
