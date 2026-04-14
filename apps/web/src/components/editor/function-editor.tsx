"use client";

import { saveDraft } from "@/app/dashboard/[fn]/actions";
import { generateCodeFromPrompt } from "@/app/dashboard/[fn]/actions";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DeployButton } from "./deploy-button";
import { EditorExecutionPane } from "./execution-pane";
import { MonacoEditor } from "./monaco-editor";

interface Props {
  fnId: string;
  initialCode: string;
}

export function FunctionEditor({ fnId, initialCode }: Props) {
  const [code, setCode] = useState(initialCode);
  const [savedCode, setSavedCode] = useState(initialCode);
  const [aiPrompt, setAiPrompt] = useState("");
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
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
  const canGenerate = aiPrompt.trim().length >= 8 && !isGenerating;

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      const result = await generateCodeFromPrompt({ fnId, prompt: aiPrompt.trim() });
      setCode(result.code);
      await persist(result.code);
      toast.success("Code generated");
      setShowAiPanel(false);
    } catch (error) {
      toast.error("Failed to generate code");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
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
            ⌘S to save
          </span>
          <button
            type="button"
            onClick={() => setShowAiPanel((prev) => !prev)}
            className="rounded-md border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1.5 text-xs font-medium text-fuchsia-200 hover:bg-fuchsia-500/20"
          >
            {showAiPanel ? "Hide AI" : "AI Generate"}
          </button>
          <DeployButton fnId={fnId} onDeploy={() => persist(code)} />
        </div>
      </div>

      {showAiPanel ? (
        <div className="border-b border-white/10 bg-[#10131b] px-4 py-3">
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-300">
            AI Function Generator
          </div>
          <textarea
            value={aiPrompt}
            onChange={(event) => setAiPrompt(event.target.value)}
            placeholder="Describe what function you want (input/output, API calls, edge cases)..."
            className="min-h-20 w-full resize-y rounded-md border border-white/15 bg-[#0b0f15] p-3 text-sm text-slate-200 outline-none ring-fuchsia-400/50 focus:ring-2"
          />
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Stub provider mode. This will replace editor contents.
            </p>
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={!canGenerate}
              className="rounded-md bg-fuchsia-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? "Generating..." : "Generate Code"}
            </button>
          </div>
        </div>
      ) : null}

      {/* Editor Area */}
      <div className="flex-1 relative min-h-0 border-b border-white/5">
        <MonacoEditor value={code} onChange={setCode} onSave={() => persist(code)} />
      </div>

      <EditorExecutionPane fnId={fnId} />
    </div>
  );
}
