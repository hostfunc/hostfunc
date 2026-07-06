"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Eye } from "lucide-react";

interface TemplatePreviewProps {
  templateName: string;
  /** The template's bundled `index.html` asset content. */
  html: string;
}

/**
 * "Preview" affordance for templates that ship an `index.html` asset.
 * Renders the HTML in a sandboxed `srcDoc` iframe — `sandbox="allow-scripts"`
 * without `allow-same-origin` runs it at an opaque origin, so template
 * scripts cannot reach hostfunc cookies or DOM. Any `fetch` back to the
 * function's own URL fails inside srcdoc; the static rendering is the point.
 */
export function TemplatePreview({ templateName, html }: TemplatePreviewProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="w-full rounded-full border border-[var(--color-border)] text-[var(--color-bone-muted)] hover:bg-white/[0.04] hover:text-[var(--color-bone)]"
        >
          <Eye className="size-3.5" />
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="border-[var(--color-border)] bg-[var(--color-ink-elevated)] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-[var(--color-bone)]">
            {templateName}
          </DialogTitle>
          <DialogDescription className="text-xs text-[var(--color-bone-muted)]">
            Static preview — interactive once deployed.
          </DialogDescription>
        </DialogHeader>
        <div className="h-[420px] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-ink)]">
          <iframe
            title={`${templateName} preview`}
            srcDoc={html}
            sandbox="allow-scripts"
            referrerPolicy="no-referrer"
            className="size-full border-0"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
