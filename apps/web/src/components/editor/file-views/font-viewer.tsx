"use client";

import { Button } from "@/components/ui/button";
import { Copy, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { FileTreeAsset } from "../file-tree";

interface Props {
  fnId: string;
  asset: FileTreeAsset;
}

const SAMPLE_TEXT_DEFAULT =
  "The quick brown fox jumps over the lazy dog. 1234567890 — Functions, fast.";
const SAMPLE_SIZES = [12, 18, 28, 48] as const;

function deriveFamily(path: string): string {
  const base = path.split("/").pop() ?? path;
  const stem = base.replace(/\.[^.]+$/, "");
  return `hostfunc-fn-${stem.replace(/[^a-zA-Z0-9_-]+/g, "-")}`;
}

export function FontViewer({ fnId, asset }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sampleText, setSampleText] = useState(SAMPLE_TEXT_DEFAULT);
  const fontRef = useRef<FontFace | null>(null);
  const family = useMemo(() => deriveFamily(asset.path), [asset.path]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        const res = await fetch(`/api/functions/${fnId}/files/${asset.path}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`fetch_failed_${res.status}`);
        const buf = await res.arrayBuffer();
        if (cancelled) return;
        const font = new FontFace(family, buf);
        await font.load();
        if (cancelled) return;
        document.fonts.add(font);
        fontRef.current = font;
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
      if (fontRef.current) document.fonts.delete(fontRef.current);
      fontRef.current = null;
    };
  }, [fnId, asset.path, family]);

  const cssSnippet = useMemo(
    () =>
      `@font-face {\n  font-family: "${family}";\n  src: url("/api/marketplace/<fn-id>/assets/${asset.path}");\n}`,
    [family, asset.path],
  );

  const copySnippet = async (snippet: string, label: string) => {
    await navigator.clipboard.writeText(snippet).catch(() => undefined);
    toast.success(`${label} copied`);
  };

  return (
    <div className="flex h-full flex-col bg-[#0d1117]">
      <div className="flex items-center justify-between border-b border-white/5 bg-[#161b22] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-slate-200">{asset.path}</span>
          <span className="text-[10px] text-slate-500">{asset.mime}</span>
          <span className="text-[10px] text-slate-500">
            {Math.max(1, Math.round(asset.sizeBytes / 1024))} KB
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void copySnippet(`font-family: "${family}";`, "font-family")}
            className="h-7 px-2 text-[11px]"
          >
            <Copy className="mr-1 size-3" /> font-family
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void copySnippet(cssSnippet, "@font-face CSS")}
            className="h-7 px-2 text-[11px]"
          >
            <Copy className="mr-1 size-3" /> @font-face
          </Button>
        </div>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        {loading ? (
          <div className="inline-flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="size-4 animate-spin" /> Loading font…
          </div>
        ) : error ? (
          <p className="text-xs text-rose-300">Could not load font: {error}</p>
        ) : (
          <>
            <div>
              <label
                htmlFor="font-sample"
                className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400"
              >
                Sample text
              </label>
              <input
                id="font-sample"
                value={sampleText}
                onChange={(event) => setSampleText(event.target.value)}
                className="w-full rounded border border-white/10 bg-[#0b0f15] px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-400/50"
              />
            </div>
            <div className="space-y-3">
              {SAMPLE_SIZES.map((size) => (
                <div key={size} className="rounded-lg border border-white/5 bg-[#0b0f15] p-4">
                  <div className="mb-1 text-[10px] uppercase tracking-wider text-slate-500">
                    {size}px
                  </div>
                  <p
                    className="whitespace-pre-wrap break-words text-slate-100"
                    style={{
                      fontFamily: `"${family}", system-ui, sans-serif`,
                      fontSize: size,
                      lineHeight: 1.3,
                    }}
                  >
                    {sampleText}
                  </p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-[11px] text-slate-300">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-slate-500">
                Use inside your function
              </p>
              <pre className="overflow-x-auto whitespace-pre text-[12px] text-slate-200">
                {`const bytes = await fn.assets.bytes(${JSON.stringify(asset.path)});
// Or use the public URL via fn.assets.url() to embed in HTML responses.`}
              </pre>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
