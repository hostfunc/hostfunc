"use client";

import { saveDraft } from "@/app/dashboard/[fn]/actions";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DeployButton } from "./deploy-button";
import { MonacoEditor } from "./monaco-editor";

interface Props {
  fnId: string;
  initialCode: string;
}

export function FunctionEditor({ fnId, initialCode }: Props) {
  const [code, setCode] = useState(initialCode);
  const [savedCode, setSavedCode] = useState(initialCode);
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
          <DeployButton fnId={fnId} onDeploy={() => persist(code)} />
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 relative min-h-0 border-b border-white/5">
        <MonacoEditor value={code} onChange={setCode} onSave={() => persist(code)} />
      </div>

      {/* Execution Terminal Pane */}
      <div className="h-64 bg-[#0a0a0a] border-t border-black/50 shrink-0 flex flex-col font-mono relative overflow-hidden">
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#111111]">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Execution Logs
            </span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              Listening
            </div>
          </div>
          <button
            type="button"
            className="text-[10px] text-muted-foreground hover:text-white transition-colors"
          >
            Clear
          </button>
        </div>

        {/* Terminal Output */}
        <div className="flex-1 overflow-y-auto p-4 text-[12px] text-slate-300 leading-relaxed space-y-2">
          <div className="flex gap-4 opacity-50">
            <span className="text-slate-500 select-none">12:00:01</span>
            <span>System: SSE Connection established. Waiting for invocations...</span>
          </div>

          <div className="flex gap-4">
            <span className="text-slate-500 select-none">12:05:14</span>
            <span className="text-emerald-400">POST /deploy</span>
          </div>
          <div className="flex gap-4 pl-16 opacity-80">
            <span>Bundling with esbuild... done (12ms)</span>
          </div>
          <div className="flex gap-4 pl-16 opacity-80">
            <span>Uploading to edge network... done (45ms)</span>
          </div>

          <div className="flex gap-4">
            <span className="text-slate-500 select-none">12:08:22</span>
            <span className="text-blue-400">GET /execution/trigger</span>
          </div>
          <div className="flex gap-4 pl-16">
            <span className="text-yellow-300">[console.log]</span> Processing payload: undefined
          </div>
          <div className="flex gap-4 pl-16 text-emerald-400">
            <span>Execution succeeded in 3ms.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
