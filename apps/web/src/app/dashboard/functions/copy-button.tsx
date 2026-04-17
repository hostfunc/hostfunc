"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface CopyButtonProps {
  value: string;
  disabled?: boolean;
  disabledLabel?: string;
  title?: string;
  /** Shown when ready to copy (default: Copy Endpoint) */
  idleLabel?: string;
  /** Shown briefly after a successful copy (default: Copied!) */
  successLabel?: string;
  className?: string;
}

export function CopyButton({
  value,
  disabled = false,
  disabledLabel = "Host first",
  title,
  idleLabel = "Copy Endpoint",
  successLabel = "Copied!",
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    if (disabled || !value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onCopy}
      disabled={disabled}
      title={title}
      className={cn(
        "h-8 shrink-0 cursor-pointer border-[var(--color-border)] bg-white/[0.02] px-2.5 text-[11px] text-[var(--color-bone-muted)] shadow-sm hover:bg-white/[0.06] hover:text-[var(--color-bone)]",
        className,
      )}
    >
      {disabled ? (
        <Copy className="mr-1.5 h-3.5 w-3.5 text-[var(--color-bone-faint)]" />
      ) : copied ? (
        <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
      ) : (
        <Copy className="mr-1.5 h-3.5 w-3.5 text-[var(--color-bone-faint)]" />
      )}
      <span
        className={
          copied && !disabled ? "font-medium text-emerald-400" : "text-[var(--color-bone-muted)]"
        }
      >
        {disabled ? disabledLabel : copied ? successLabel : idleLabel}
      </span>
    </Button>
  );
}
