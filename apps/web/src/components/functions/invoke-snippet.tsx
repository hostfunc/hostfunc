"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Check, Copy, Terminal } from "lucide-react";
import { useRef, useState } from "react";

type SnippetKind = "curl" | "fetch";

function buildCurlSnippet(runUrl: string): string {
  return `curl -X POST '${runUrl}' -H 'content-type: application/json' -d '{"name":"world"}'`;
}

function buildFetchSnippet(runUrl: string): string {
  return [
    `const res = await fetch("${runUrl}", {`,
    '  method: "POST",',
    '  headers: { "content-type": "application/json" },',
    '  body: JSON.stringify({ name: "world" }),',
    "});",
  ].join("\n");
}

export function InvokeSnippet({ runUrl }: { runUrl: string }) {
  const [kind, setKind] = useState<SnippetKind>("curl");
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const snippet = kind === "curl" ? buildCurlSnippet(runUrl) : buildFetchSnippet(runUrl);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 1500);
  };

  const selectKind = (next: SnippetKind) => {
    setKind(next);
    setCopied(false);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-[var(--color-border)] bg-transparent text-[var(--color-bone)] hover:bg-white/[0.04]"
        >
          <Terminal className="mr-2 h-4 w-4" />
          Invoke
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[440px] max-w-[calc(100vw-2rem)] border-[var(--color-border)] bg-[var(--color-ink-elevated)] p-3 text-[var(--color-bone)]"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex rounded-md border border-[var(--color-border)] bg-black/20 p-0.5">
            {(["curl", "fetch"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => selectKind(option)}
                className={cn(
                  "rounded px-2.5 py-1 font-mono text-xs transition",
                  kind === option
                    ? "bg-white/[0.08] text-[var(--color-bone)]"
                    : "text-[var(--color-bone-muted)] hover:text-[var(--color-bone)]",
                )}
                aria-pressed={kind === option}
              >
                {option}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex items-center gap-1.5 rounded border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-bone-muted)] transition hover:text-[var(--color-bone)]"
            title="Copy snippet"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </button>
        </div>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-md border border-[var(--color-border)] bg-black/25 p-3 font-mono text-xs leading-relaxed text-cyan-100">
          {snippet}
        </pre>
        <p className="mt-2 text-[11px] text-[var(--color-bone-faint)]">
          GET works too — query params become input.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
