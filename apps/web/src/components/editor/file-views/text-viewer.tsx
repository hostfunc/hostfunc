"use client";

import { Button } from "@/components/ui/button";
import { Editor } from "@monaco-editor/react";
import { Loader2, Save } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { FileTreeAsset } from "../file-tree";

interface Props {
  fnId: string;
  asset: FileTreeAsset;
  onAssetUpdated: (next: FileTreeAsset) => void;
  readOnly?: boolean;
}

const EXT_LANGUAGE: Record<string, string> = {
  md: "markdown",
  markdown: "markdown",
  txt: "plaintext",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  svg: "xml",
  html: "html",
  css: "css",
};

function languageFor(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return EXT_LANGUAGE[ext] ?? "plaintext";
}

export function TextViewer({ fnId, asset, onAssetUpdated, readOnly = false }: Props) {
  const [content, setContent] = useState<string>("");
  const [savedContent, setSavedContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/functions/${fnId}/files/${asset.path}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`fetch_failed_${res.status}`);
        const text = await res.text();
        if (!cancelled) {
          setContent(text);
          setSavedContent(text);
        }
      } catch (e) {
        toast.error(`Failed to load ${asset.path}`, {
          description: e instanceof Error ? e.message : String(e),
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [fnId, asset.path]);

  const persist = useCallback(
    async (next: string) => {
      setSaving(true);
      try {
        const res = await fetch(`/api/functions/${fnId}/files/${asset.path}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            replace: { contentText: next, mime: asset.mime },
          }),
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => null)) as {
            error: string;
            message?: string;
          } | null;
          throw new Error(json?.message ?? json?.error ?? "save_failed");
        }
        const json = (await res.json()) as { asset: FileTreeAsset };
        setSavedContent(next);
        onAssetUpdated(json.asset);
      } catch (e) {
        toast.error("Failed to save file", {
          description: e instanceof Error ? e.message : String(e),
        });
      } finally {
        setSaving(false);
      }
    },
    [fnId, asset.path, asset.mime, onAssetUpdated],
  );

  useEffect(() => {
    if (readOnly) return;
    if (loading) return;
    if (content === savedContent) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void persist(content), 1500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [content, savedContent, loading, persist, readOnly]);

  const dirty = content !== savedContent;

  return (
    <div className="flex h-full flex-col bg-[#0d1117]">
      <div className="flex items-center justify-between border-b border-white/5 bg-[#161b22] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-slate-200">{asset.path}</span>
          <span className="text-[10px] text-slate-500">{asset.mime}</span>
        </div>
        {!readOnly ? (
          <div className="flex items-center gap-3">
            <span className="inline-flex h-5 items-center gap-1 text-[10px] text-slate-400">
              {saving ? (
                <>
                  <Loader2 className="size-3 animate-spin" /> Saving…
                </>
              ) : dirty ? (
                <span className="inline-flex items-center gap-1 text-yellow-300">
                  <span className="size-1.5 rounded-full bg-yellow-400" /> unsaved
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-emerald-300">
                  <span className="size-1.5 rounded-full bg-emerald-400" /> synced
                </span>
              )}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={!dirty || saving}
              onClick={() => void persist(content)}
              className="h-7 px-2 text-[11px]"
            >
              <Save className="mr-1 size-3.5" /> Save
            </Button>
          </div>
        ) : null}
      </div>
      <div className="min-h-0 flex-1">
        <Editor
          value={content}
          language={languageFor(asset.path)}
          onChange={(value) => setContent(value ?? "")}
          theme="vs-dark"
          options={{
            readOnly,
            minimap: { enabled: false },
            fontSize: 13,
            wordWrap: "on",
            scrollBeyondLastLine: false,
            padding: { top: 12 },
          }}
          loading={
            <div className="flex h-full items-center justify-center text-xs text-slate-500">
              Loading editor…
            </div>
          }
        />
      </div>
    </div>
  );
}
