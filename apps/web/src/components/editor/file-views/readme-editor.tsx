"use client";

import { Button } from "@/components/ui/button";
import { Editor } from "@monaco-editor/react";
import { Eye, Loader2, PencilLine, Save, Split } from "lucide-react";
import { marked } from "marked";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { FileTreeAsset } from "../file-tree";

interface Props {
  fnId: string;
  asset: FileTreeAsset;
  onAssetUpdated: (next: FileTreeAsset) => void;
  readOnly?: boolean;
}

type ViewMode = "edit" | "split" | "preview";

marked.setOptions({ gfm: true, breaks: true });

export function ReadmeEditor({ fnId, asset, onAssetUpdated, readOnly = false }: Props) {
  const [content, setContent] = useState<string>("");
  const [savedContent, setSavedContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(readOnly ? "preview" : "split");
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
        toast.error("Failed to load README", {
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
            replace: { contentText: next, mime: "text/markdown" },
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
        toast.error("Failed to save README", {
          description: e instanceof Error ? e.message : String(e),
        });
      } finally {
        setSaving(false);
      }
    },
    [fnId, asset.path, onAssetUpdated],
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
  const previewHtml = useMemo(() => {
    try {
      return marked.parse(content || "*Empty README*", { async: false }) as string;
    } catch {
      return "<p>Could not render markdown.</p>";
    }
  }, [content]);

  return (
    <div className="flex h-full flex-col bg-[#0d1117]">
      <div className="flex items-center justify-between border-b border-white/5 bg-[#161b22] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-slate-200">{asset.path}</span>
          <span className="text-[10px] text-slate-500">
            Auto-syncs to your marketplace listing.
          </span>
        </div>
        <div className="flex items-center gap-3">
          {!readOnly ? (
            <>
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
                onClick={() => void persist(content)}
                disabled={!dirty || saving}
                className="h-7 px-2 text-[11px]"
              >
                <Save className="mr-1 size-3.5" /> Save
              </Button>
            </>
          ) : null}
          <div className="flex items-center gap-1 rounded-md border border-white/10 bg-black/20 p-0.5">
            <ViewToggle
              icon={PencilLine}
              label="Edit"
              active={viewMode === "edit"}
              onClick={() => setViewMode("edit")}
            />
            <ViewToggle
              icon={Split}
              label="Split"
              active={viewMode === "split"}
              onClick={() => setViewMode("split")}
            />
            <ViewToggle
              icon={Eye}
              label="Preview"
              active={viewMode === "preview"}
              onClick={() => setViewMode("preview")}
            />
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1">
        {viewMode === "edit" || viewMode === "split" ? (
          <div
            className={`min-h-0 ${viewMode === "split" ? "border-r border-white/5" : ""}`}
            style={
              viewMode === "split" ? { gridColumn: "1 / span 1", display: "contents" } : undefined
            }
          >
            <SplitWrapper viewMode={viewMode}>
              <div className="min-h-0">
                <Editor
                  value={content}
                  language="markdown"
                  onChange={(value) => setContent(value ?? "")}
                  theme="vs-dark"
                  options={{
                    readOnly,
                    minimap: { enabled: false },
                    fontSize: 13,
                    wordWrap: "on",
                    lineNumbers: "off",
                    folding: false,
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
              {viewMode === "split" ? (
                <div className="min-h-0 overflow-y-auto bg-[#0b0f15] px-6 py-5">
                  <ReadmePreview html={previewHtml} />
                </div>
              ) : null}
            </SplitWrapper>
          </div>
        ) : (
          <div className="min-h-0 overflow-y-auto bg-[#0b0f15] px-6 py-5">
            <ReadmePreview html={previewHtml} />
          </div>
        )}
      </div>
    </div>
  );
}

function SplitWrapper({ viewMode, children }: { viewMode: ViewMode; children: React.ReactNode }) {
  if (viewMode === "split") {
    return <div className="grid min-h-0 grid-cols-2 grid-rows-1">{children}</div>;
  }
  return <div className="min-h-0">{children}</div>;
}

function ViewToggle({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof PencilLine;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] transition ${
        active ? "bg-violet-500/20 text-violet-100" : "text-slate-300 hover:bg-white/5"
      }`}
    >
      <Icon className="size-3.5" /> {label}
    </button>
  );
}

function ReadmePreview({ html }: { html: string }) {
  return (
    <article
      className="markdown-readme"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: markdown is locally rendered with marked
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
