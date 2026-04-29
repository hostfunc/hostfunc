"use client";

import { saveDraft } from "@/app/dashboard/[fn]/actions";
import { generateCodeFromPrompt } from "@/app/dashboard/[fn]/actions";
import { Button } from "@/components/ui/button";
import {
  BookText,
  Bot,
  ChevronDown,
  FileText,
  Link2,
  Loader2,
  NotebookPen,
  SearchCheck,
  Send,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DeployButton } from "./deploy-button";
import { EditorExecutionPane } from "./execution-pane";
import { FileTree, type FileTreeAsset } from "./file-tree";
import { FontViewer } from "./file-views/font-viewer";
import { ImageViewer } from "./file-views/image-viewer";
import { ReadmeEditor } from "./file-views/readme-editor";
import { TextViewer } from "./file-views/text-viewer";
import { MonacoDiffEditor, MonacoEditor } from "./monaco-editor";
import { RunButton } from "./run-button";

export interface AiContextSummary {
  id: string;
  kind: "note" | "url" | "file";
  name: string;
  bytes: number;
  enabled: boolean;
  sourceUri: string | null;
}

interface Props {
  fnId: string;
  initialCode: string;
  packageNames: string[];
  readOnly?: boolean;
  contexts?: AiContextSummary[];
  assets?: FileTreeAsset[];
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

interface AiChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  kind: "normal" | "error";
}

function AiProviderIcon({ provider }: { provider: "openai" | "claude" }) {
  const src = provider === "openai" ? "/ChatGPT%20logo.svg" : "/Claude%20logo.svg";
  const iconClass =
    provider === "openai"
      ? "size-4 object-contain brightness-0 invert"
      : "size-4 object-contain rounded-[2px]";
  return (
    <img src={src} alt="" aria-hidden="true" className={iconClass} />
  );
}

export function FunctionEditor({
  fnId,
  initialCode,
  packageNames,
  readOnly = false,
  contexts = [],
  assets: initialAssets = [],
}: Props) {
  const [code, setCode] = useState(initialCode);
  const [savedCode, setSavedCode] = useState(initialCode);
  const [assets, setAssets] = useState<FileTreeAsset[]>(initialAssets);
  const [selectedPath, setSelectedPath] = useState<string>("index.ts");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(`hostfunc:editor:selected:${fnId}`);
      if (!stored) return;
      if (stored === "index.ts") {
        setSelectedPath("index.ts");
        return;
      }
      if (initialAssets.some((a) => a.path === stored)) {
        setSelectedPath(stored);
      }
    } catch {
      // ignore localStorage failures
    }
  }, [fnId, initialAssets]);

  useEffect(() => {
    try {
      window.localStorage.setItem(`hostfunc:editor:selected:${fnId}`, selectedPath);
    } catch {
      // ignore
    }
  }, [fnId, selectedPath]);

  const selectedAsset = useMemo(
    () => (selectedPath === "index.ts" ? null : assets.find((a) => a.path === selectedPath) ?? null),
    [assets, selectedPath],
  );

  const handleAssetUpdated = useCallback((next: FileTreeAsset) => {
    setAssets((prev) => {
      const filtered = prev.filter((a) => a.path !== next.path);
      return [...filtered, next].sort((a, b) => a.path.localeCompare(b.path));
    });
  }, []);

  useEffect(() => {
    if (selectedPath === "index.ts") return;
    if (assets.some((a) => a.path === selectedPath)) return;
    setSelectedPath("index.ts");
  }, [assets, selectedPath]);

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiProvider, setAiProvider] = useState<"openai" | "claude">("openai");
  const [aiModel, setAiModel] = useState("gpt-4o-mini");
  const [useLiveLookup, setUseLiveLookup] = useState(true);
  const [lookupHints, setLookupHints] = useState("discord.com, api.slack.com, docs.aws.amazon.com");
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const enabledContexts = useMemo(() => contexts.filter((ctx) => ctx.enabled), [contexts]);
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>(
    () => enabledContexts.map((ctx) => ctx.id),
  );
  const [aiMessages, setAiMessages] = useState<AiChatMessage[]>([
    {
      id: "intro",
      role: "assistant",
      kind: "normal",
      content:
        "Describe the function you need, and I will generate a code patch for review in the diff editor.",
    },
  ]);
  const [pendingGeneratedCode, setPendingGeneratedCode] = useState<string | null>(null);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  const aiScrollRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    const messageCount = aiMessages.length;
    if (messageCount < 1 && !isGenerating) return;
    if (!showAiPanel) return;
    const el = aiScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [aiMessages.length, showAiPanel, isGenerating]);

  const handleGenerate = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt || isGenerating || aiModel.trim().length < 1) return;

    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now() + 1}`;
    setAiMessages((prev) => [
      ...prev,
      { id: userMessageId, role: "user", kind: "normal", content: prompt },
      { id: assistantMessageId, role: "assistant", kind: "normal", content: "Generating code patch..." },
    ]);
    setAiPrompt("");

    try {
      setIsGenerating(true);
      const result = await generateCodeFromPrompt({
        fnId,
        prompt,
        provider: aiProvider,
        model: aiModel.trim(),
        useLiveLookup,
        lookupHints: lookupHints
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
        contextIds: selectedContextIds.filter((id) =>
          enabledContexts.some((ctx) => ctx.id === id),
        ),
      });
      setPendingGeneratedCode(result.code);
      toast.success("Code generated. Review and accept changes.");
      setAiMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: "Patch ready. Review the diff below, then accept or discard changes.",
              }
            : msg,
        ),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate code";
      setAiMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId ? { ...msg, kind: "error", content: `Generation failed: ${message}` } : msg,
        ),
      );
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
        <div className="border-b border-emerald-500/30 bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 px-4 py-3">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-400/25 bg-black/15 px-3 py-2">
            <p className="text-xs text-emerald-100">
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
          <div className="rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-slate-900/80 to-slate-950/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/35 bg-violet-500/15 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-violet-200">
                  <Bot className="size-3" />
                  AI Assistant
                </div>
                <p className="text-xs text-slate-300">Chat to generate and refine code patches for this function.</p>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-slate-300">
                <SlidersHorizontal className="size-3.5 text-slate-400" />
                <AiProviderIcon provider={aiProvider} />
                {aiProvider} · {aiModel}
              </div>
            </div>

            <details open className="border-b border-white/10 px-4 py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between text-xs marker:content-none">
                <div className="space-y-1">
                  <p className="flex items-center gap-2 font-medium text-slate-200">
                    <BookText className="size-3.5 text-violet-300" /> Docs attached
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Select per-function notes, URLs, and files to include in every generation.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[10px] text-slate-300">
                    {selectedContextIds.length}/{enabledContexts.length} selected
                  </span>
                  <ChevronDown className="size-4 text-slate-400" />
                </div>
              </summary>
              <div className="mt-3 space-y-2 rounded-lg border border-white/10 bg-black/20 p-3">
                {enabledContexts.length === 0 ? (
                  <p className="text-[11px] text-slate-400">
                    No docs attached yet. Add notes, URLs, or upload markdown / JSON files to give the
                    AI richer context.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {enabledContexts.map((ctx) => {
                      const checked = selectedContextIds.includes(ctx.id);
                      const Icon =
                        ctx.kind === "note"
                          ? NotebookPen
                          : ctx.kind === "url"
                            ? Link2
                            : FileText;
                      return (
                        <li key={ctx.id}>
                          <label className="flex cursor-pointer items-center gap-3 rounded-md border border-white/10 bg-[#0b0f15] px-2.5 py-1.5 text-xs text-slate-200 hover:border-white/25">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => {
                                setSelectedContextIds((prev) =>
                                  event.target.checked
                                    ? prev.includes(ctx.id)
                                      ? prev
                                      : [...prev, ctx.id]
                                    : prev.filter((id) => id !== ctx.id),
                                );
                              }}
                              className="h-3.5 w-3.5 accent-violet-400"
                            />
                            <Icon className="size-3.5 text-slate-400" />
                            <span className="flex-1 truncate">{ctx.name}</span>
                            <span className="rounded-sm border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                              {ctx.kind}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {Math.max(1, Math.round(ctx.bytes / 1024))} KB
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-slate-500">
                    Up to 20 docs · ~60 KB budget merged into each prompt.
                  </span>
                  <Link
                    href={`/dashboard/${fnId}/settings/context`}
                    className="text-violet-300 hover:text-violet-200"
                  >
                    Manage →
                  </Link>
                </div>
              </div>
            </details>

            <details className="border-b border-white/10 px-4 py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between text-xs marker:content-none">
                <div className="space-y-1">
                  <p className="font-medium text-slate-200">Advanced options</p>
                  <p className="text-[11px] text-slate-400">Model selection, docs lookup, and domains.</p>
                </div>
                <ChevronDown className="size-4 text-slate-400" />
              </summary>
              <div className="mt-3 space-y-3 rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="space-y-1.5">
                  <label htmlFor="aiGeneratorModel" className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Provider and model
                  </label>
                  <div className="flex items-center gap-1.5">
                    <div id="aiGeneratorProvider" className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-pressed={aiProvider === "openai"}
                        onClick={() => {
                          if (aiProvider === "openai") return;
                          const nextModels = modelsForProvider("openai");
                          setAiProvider("openai");
                          setAiModel(nextModels[0] ?? "");
                        }}
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-md border px-0 text-sm transition ${
                          aiProvider === "openai"
                            ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-100"
                            : "border-white/15 bg-[#0b0f15] text-slate-300 hover:border-white/30"
                        }`}
                      >
                        <span className="sr-only">OpenAI</span>
                        <AiProviderIcon provider="openai" />
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
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-md border px-0 text-sm transition ${
                          aiProvider === "claude"
                            ? "border-amber-400/60 bg-amber-500/15 text-amber-100"
                            : "border-white/15 bg-[#0b0f15] text-slate-300 hover:border-white/30"
                        }`}
                      >
                        <span className="sr-only">Claude</span>
                        <AiProviderIcon provider="claude" />
                      </button>
                    </div>
                    <div className="relative flex-1">
                      <select
                        id="aiGeneratorModel"
                        value={aiModel}
                        onChange={(event) => setAiModel(event.target.value)}
                        className="h-10 w-full appearance-none rounded-md border border-white/15 bg-[#0b0f15] px-3 pr-16 text-sm text-slate-200 outline-none ring-violet-400/50 focus:ring-2"
                      >
                        {modelsForProvider(aiProvider).map((model) => (
                          <option key={model} value={model}>
                            {model}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center gap-1.5 text-slate-400">
                        <ChevronDown className="size-3.5" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-[auto,1fr] md:items-end">
                    <button
                    type="button"
                    onClick={() => setUseLiveLookup((prev) => !prev)}
                    className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-medium transition ${
                      useLiveLookup
                        ? "border-cyan-400/50 bg-cyan-500/10 text-cyan-100"
                        : "border-white/15 bg-[#0b0f15] text-slate-300 hover:border-white/30"
                    }`}
                  >
                    <SearchCheck className="size-3.5" />
                    Live docs lookup
                  </button>
                  <div className="grid gap-1.5">
                    <label htmlFor="aiLookupHints" className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Lookup domains
                    </label>
                    <input
                      id="aiLookupHints"
                      value={lookupHints}
                      onChange={(event) => setLookupHints(event.target.value)}
                      className="h-9 rounded-md border border-white/15 bg-[#0b0f15] px-3 text-xs text-slate-200 outline-none ring-cyan-400/50 focus:ring-2"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">Tip: add only trusted docs domains for faster, cleaner context.</p>
              </div>
            </details>

            <div ref={aiScrollRef} aria-live="polite" className="max-h-80 space-y-3 overflow-y-auto px-4 py-4">
              {aiMessages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        isUser
                          ? "rounded-br-md bg-violet-500 text-white"
                          : msg.kind === "error"
                            ? "rounded-bl-md border border-red-500/35 bg-red-500/10 text-red-200"
                            : "rounded-bl-md border border-white/10 bg-white/5 text-slate-200"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              {isGenerating ? (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
                    <Loader2 className="size-3.5 animate-spin" />
                    Thinking...
                  </div>
                </div>
              ) : null}
            </div>

            <div className="border-t border-white/10 bg-black/10 p-4">
              <div className="rounded-2xl border border-white/10 bg-[#0b0f15] p-2">
                <textarea
                  id="aiPromptInput"
                  value={aiPrompt}
                  onChange={(event) => setAiPrompt(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleGenerate();
                    }
                  }}
                  placeholder="Message AI assistant with function requirements, edge cases, and integrations..."
                  className="max-h-40 min-h-20 w-full resize-y bg-transparent p-2 text-sm text-slate-200 outline-none placeholder:text-slate-500"
                />
                <div className="flex items-center justify-between gap-3 px-2 pb-1">
                  <p className="text-xs text-slate-400">Enter to send, Shift+Enter for newline.</p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleGenerate()}
                    disabled={!canGenerate}
                    className="h-8 bg-violet-500 text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    {isGenerating ? "Generating" : "Generate"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Editor Area: file tree + main pane */}
      <div className="flex flex-1 min-h-0 border-b border-white/5">
        <FileTree
          fnId={fnId}
          assets={assets}
          selectedPath={selectedPath}
          onSelect={setSelectedPath}
          onAssetsChanged={setAssets}
          readOnly={readOnly}
        />
        <div className="relative flex min-h-0 flex-1 flex-col">
          {selectedPath === "index.ts" ? (
            hasPendingDiff ? (
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
            )
          ) : selectedAsset ? (
            selectedAsset.kind === "readme" ? (
              <ReadmeEditor
                fnId={fnId}
                asset={selectedAsset}
                onAssetUpdated={handleAssetUpdated}
                readOnly={readOnly}
              />
            ) : selectedAsset.kind === "image" ? (
              <ImageViewer fnId={fnId} asset={selectedAsset} />
            ) : selectedAsset.kind === "font" ? (
              <FontViewer fnId={fnId} asset={selectedAsset} />
            ) : (
              <TextViewer
                fnId={fnId}
                asset={selectedAsset}
                onAssetUpdated={handleAssetUpdated}
                readOnly={readOnly}
              />
            )
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-500">
              Select a file to start editing.
            </div>
          )}
        </div>
      </div>

      <EditorExecutionPane fnId={fnId} />
    </div>
  );
}
