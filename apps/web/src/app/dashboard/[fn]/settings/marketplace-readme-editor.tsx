"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Eye, FileText, PencilLine, Split } from "lucide-react";
import { marked } from "marked";
import { useMemo, useState } from "react";

type ViewMode = "edit" | "split" | "preview";

const README_MAX = 8000;

const README_TEMPLATE = `# Overview
Describe what this function does and when to use it.

## Inputs
- \`inputName\` (type): What this input controls.

## Output
- Returns: Describe the response shape and key fields.

## Required Packages
- package-name: Why this package is needed.

## Setup
### Environment Variables
- \`API_KEY\`: Explain where users get this.

## Example Request
\`\`\`json
{
  "example": true
}
\`\`\`

## Example Response
\`\`\`json
{
  "ok": true
}
\`\`\`

## Notes
- Mention limits, retries, or important caveats.
`;

marked.setOptions({ gfm: true, breaks: true });

export function MarketplaceReadmeEditor({
  name,
  initialValue,
}: {
  name: string;
  initialValue: string;
}) {
  const [content, setContent] = useState(initialValue);
  const [viewMode, setViewMode] = useState<ViewMode>("edit");

  const html = useMemo(() => {
    try {
      return marked.parse(content || "*No README yet.*", { async: false }) as string;
    } catch {
      return "<p>Could not render markdown preview.</p>";
    }
  }, [content]);

  const applyTemplate = () => {
    if (content.trim().length === 0) {
      setContent(README_TEMPLATE);
      return;
    }
    if (
      window.confirm(
        "Replace the current README with the marketplace template? This will overwrite the editor content.",
      )
    ) {
      setContent(README_TEMPLATE);
    }
  };

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={content} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-ink)]/60 p-0.5">
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

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={applyTemplate}
            className="h-8 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-xs text-[var(--color-bone)]"
          >
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Use README template
          </Button>
          <span className="text-xs text-[var(--color-bone-faint)]">
            {content.length}/{README_MAX}
          </span>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-ink)]/60",
          viewMode === "split" ? "grid grid-cols-1 lg:grid-cols-2" : "",
        )}
      >
        {viewMode !== "preview" ? (
          <div className={cn("min-h-[280px]", viewMode === "split" ? "border-b border-[var(--color-border)] lg:border-b-0 lg:border-r" : "")}>
            <textarea
              id="marketplaceReadme"
              value={content}
              maxLength={README_MAX}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Document inputs, outputs, packages, and example payloads."
              className="min-h-[280px] w-full resize-y bg-transparent p-3 text-sm text-[var(--color-bone)] outline-none placeholder:text-[var(--color-bone-faint)]"
            />
          </div>
        ) : null}

        {viewMode !== "edit" ? (
          <div className="min-h-[280px] overflow-auto bg-black/10 p-4">
            <article
              className="markdown-readme"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: markdown preview from local input
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        ) : null}
      </div>
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
      className={cn(
        "inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] transition",
        active
          ? "bg-[var(--color-amber)]/20 text-[var(--color-bone)]"
          : "text-[var(--color-bone-muted)] hover:bg-white/5 hover:text-[var(--color-bone)]",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
