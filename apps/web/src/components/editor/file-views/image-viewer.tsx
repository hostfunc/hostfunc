"use client";

import { Button } from "@/components/ui/button";
import { Copy, Loader2, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { FileTreeAsset } from "../file-tree";

interface Props {
  fnId: string;
  asset: FileTreeAsset;
}

export function ImageViewer({ fnId, asset }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/functions/${fnId}/files/${asset.path}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`fetch_failed_${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      } catch (e) {
        toast.error("Failed to load image", {
          description: e instanceof Error ? e.message : String(e),
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [fnId, asset.path]);

  const copyAssetUrl = async () => {
    const previewUrl = `/api/functions/${fnId}/files/${asset.path}`;
    await navigator.clipboard.writeText(previewUrl).catch(() => undefined);
    toast.success("Asset preview URL copied");
  };

  const copyImportSnippet = async () => {
    const snippet = `// Use it inside main():\nconst bytes = await fn.assets.bytes(${JSON.stringify(asset.path)});\nconst url = fn.assets.url(${JSON.stringify(asset.path)}); // public marketplace URL`;
    await navigator.clipboard.writeText(snippet).catch(() => undefined);
    toast.success("SDK snippet copied");
  };

  return (
    <div className="flex h-full flex-col bg-ink">
      <div className="flex items-center justify-between border-b border-border bg-ink-elevated px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-bone">{asset.path}</span>
          <span className="text-[10px] text-bone-faint">{asset.mime}</span>
          <span className="text-[10px] text-bone-faint">
            {Math.max(1, Math.round(asset.sizeBytes / 1024))} KB
          </span>
          {dimensions ? (
            <span className="text-[10px] text-bone-faint">
              {dimensions.width}×{dimensions.height}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void copyImportSnippet()}
            className="h-7 px-2 text-[11px]"
          >
            <Copy className="mr-1 size-3" /> SDK snippet
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void copyAssetUrl()}
            className="h-7 px-2 text-[11px]"
          >
            <Copy className="mr-1 size-3" /> URL
          </Button>
          <div className="ml-2 flex items-center gap-1 rounded-md border border-border bg-ink-overlay p-0.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.1, z - 0.25))}
              className="rounded p-1 text-bone-muted hover:bg-white/5"
              aria-label="Zoom out"
            >
              <ZoomOut className="size-3.5" />
            </button>
            <span className="px-1 text-[11px] tabular-nums text-bone-muted">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(8, z + 0.25))}
              className="rounded p-1 text-bone-muted hover:bg-white/5"
              aria-label="Zoom in"
            >
              <ZoomIn className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="rounded p-1 text-bone-muted hover:bg-white/5"
              aria-label="Reset zoom"
            >
              <Maximize2 className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div
        className="relative flex flex-1 items-center justify-center overflow-auto"
        style={{
          backgroundImage:
            "linear-gradient(45deg, #211e1a 25%, transparent 25%), linear-gradient(-45deg, #211e1a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #211e1a 75%), linear-gradient(-45deg, transparent 75%, #211e1a 75%)",
          backgroundSize: "16px 16px",
          backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
          backgroundColor: "#0a0908",
        }}
      >
        {loading ? (
          <div className="inline-flex items-center gap-2 text-xs text-bone-muted">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : src ? (
          <img
            src={src}
            alt={asset.path}
            style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
            className="max-h-full max-w-full"
            onLoad={(event) => {
              const img = event.currentTarget;
              setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
            }}
          />
        ) : (
          <p className="text-xs text-bone-faint">Image unavailable.</p>
        )}
      </div>
    </div>
  );
}
