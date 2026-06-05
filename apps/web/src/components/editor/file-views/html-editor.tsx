"use client";

import { Button } from "@/components/ui/button";
import { Editor } from "@monaco-editor/react";
import { Eye, Globe, Loader2, PencilLine, Save, Split } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { FileTreeAsset } from "../file-tree";
import { HOSTFUNC_DARK_THEME, defineHostfuncTheme } from "../monaco-theme";
import { languageFor } from "./language";

interface Props {
  fnId: string;
  asset: FileTreeAsset;
  assets: FileTreeAsset[];
  onAssetUpdated: (next: FileTreeAsset) => void;
  readOnly?: boolean;
}

type ViewMode = "edit" | "split" | "preview";

interface SiblingSource {
  kind: "style" | "script";
  text: string;
}

function basename(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? path : path.slice(i + 1);
}

/** Strips query/hash and resolves to a bare filename for sibling matching. */
function refName(raw: string): string {
  const clean = raw.split(/[?#]/)[0] ?? "";
  return basename(clean);
}

/** Stops inlined content from prematurely closing its host tag. */
function neutralize(source: string): string {
  return source.replace(/<\/(script|style)/gi, "<\\/$1");
}

/**
 * Builds the document rendered in the preview iframe: the current HTML buffer
 * with same-name sibling `.css`/`.js` references inlined so the preview is
 * self-contained (the sandboxed iframe has an opaque origin and cannot fetch
 * the authenticated asset routes).
 */
function buildPreviewDoc(html: string, siblings: Record<string, SiblingSource>): string {
  let doc = html.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!/rel\s*=\s*["']?stylesheet["']?/i.test(tag)) return tag;
    const href = tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href) return tag;
    const sib = siblings[refName(href)];
    if (sib && sib.kind === "style") {
      return `<style data-hostfunc-inlined>${neutralize(sib.text)}</style>`;
    }
    return tag;
  });
  doc = doc.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (tag) => {
    const src = tag.match(/src\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!src) return tag;
    const sib = siblings[refName(src)];
    if (sib && sib.kind === "script") {
      const type = tag.match(/type\s*=\s*["']([^"']+)["']/i)?.[1];
      return `<script${type ? ` type="${type}"` : ""} data-hostfunc-inlined>${neutralize(sib.text)}</script>`;
    }
    return tag;
  });
  return doc;
}

export function HtmlEditor({ fnId, asset, assets, onAssetUpdated, readOnly = false }: Props) {
  const [content, setContent] = useState<string>("");
  const [savedContent, setSavedContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(readOnly ? "preview" : "split");
  const [previewContent, setPreviewContent] = useState<string>("");
  const [siblings, setSiblings] = useState<Record<string, SiblingSource>>({});
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  const isIndex = asset.path === "index.html";

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
          setPreviewContent(text);
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

  // Fetch sibling stylesheet/script content so the preview can inline it.
  const siblingKey = useMemo(
    () =>
      assets
        .filter((a) => a.kind === "style" || a.kind === "script")
        .map((a) => `${a.path}:${a.sha256}`)
        .sort()
        .join(","),
    [assets],
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: siblingKey encodes the relevant assets.
  useEffect(() => {
    let cancelled = false;
    const sources = assets.filter((a) => a.kind === "style" || a.kind === "script");
    const load = async () => {
      const entries = await Promise.all(
        sources.map(async (a) => {
          try {
            const res = await fetch(`/api/functions/${fnId}/files/${a.path}`, {
              cache: "no-store",
            });
            if (!res.ok) return null;
            const text = await res.text();
            return [basename(a.path), { kind: a.kind as "style" | "script", text }] as const;
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;
      const map: Record<string, SiblingSource> = {};
      for (const entry of entries) {
        if (entry) map[entry[0]] = entry[1];
      }
      setSiblings(map);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [fnId, siblingKey]);

  const persist = useCallback(
    async (next: string) => {
      setSaving(true);
      try {
        const res = await fetch(`/api/functions/${fnId}/files/${asset.path}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ replace: { contentText: next, mime: "text/html" } }),
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
    [fnId, asset.path, onAssetUpdated],
  );

  // Debounced auto-save.
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

  // Debounced preview refresh — re-renders as you type.
  useEffect(() => {
    const t = setTimeout(() => setPreviewContent(content), 300);
    return () => clearTimeout(t);
  }, [content]);

  const dirty = content !== savedContent;
  const previewDoc = useMemo(
    () => buildPreviewDoc(previewContent, siblings),
    [previewContent, siblings],
  );

  return (
    <div className="flex h-full flex-col bg-ink">
      <div className="flex items-center justify-between border-b border-border bg-ink-elevated px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-bone">{asset.path}</span>
          {isIndex ? (
            <span className="inline-flex items-center gap-1 rounded bg-amber/15 px-1.5 py-0.5 text-[10px] text-amber">
              <Globe className="size-3" /> Served at your function URL
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {!readOnly ? (
            <>
              <span className="inline-flex h-5 items-center gap-1 text-[10px] text-bone-muted">
                {saving ? (
                  <>
                    <Loader2 className="size-3 animate-spin" /> Saving…
                  </>
                ) : dirty ? (
                  <span className="inline-flex items-center gap-1 text-amber">
                    <span className="size-1.5 rounded-full bg-amber" /> unsaved
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-emerald">
                    <span className="size-1.5 rounded-full bg-emerald" /> synced
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
          <div className="flex items-center gap-1 rounded-md border border-border bg-ink-overlay p-0.5">
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
        {viewMode === "split" ? (
          <div className="grid min-h-0 grid-cols-2 grid-rows-1">
            <div className="min-h-0 border-r border-border">
              <HtmlMonaco
                path={asset.path}
                value={content}
                onChange={setContent}
                readOnly={readOnly}
              />
            </div>
            <HtmlPreview doc={previewDoc} />
          </div>
        ) : viewMode === "edit" ? (
          <HtmlMonaco path={asset.path} value={content} onChange={setContent} readOnly={readOnly} />
        ) : (
          <HtmlPreview doc={previewDoc} />
        )}
      </div>
    </div>
  );
}

function HtmlMonaco({
  path,
  value,
  onChange,
  readOnly,
}: {
  path: string;
  value: string;
  onChange: (next: string) => void;
  readOnly: boolean;
}) {
  return (
    <div className="h-full min-h-0">
      <Editor
        value={value}
        language={languageFor(path)}
        onChange={(next) => onChange(next ?? "")}
        beforeMount={defineHostfuncTheme}
        theme={HOSTFUNC_DARK_THEME}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          wordWrap: "on",
          scrollBeyondLastLine: false,
          padding: { top: 12 },
        }}
        loading={
          <div className="flex h-full items-center justify-center text-xs text-bone-faint">
            Loading editor…
          </div>
        }
      />
    </div>
  );
}

function HtmlPreview({ doc }: { doc: string }) {
  return (
    <div className="flex min-h-0 flex-col bg-white">
      <iframe
        title="HTML preview"
        srcDoc={doc}
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        className="min-h-0 flex-1 border-0"
      />
      <p className="border-t border-border bg-ink-elevated px-3 py-1.5 text-[10px] text-bone-faint">
        Sandboxed preview. Images and the live URL resolve after you deploy.
      </p>
    </div>
  );
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
        active ? "bg-amber/15 text-amber" : "text-bone-muted hover:bg-white/5"
      }`}
    >
      <Icon className="size-3.5" /> {label}
    </button>
  );
}
