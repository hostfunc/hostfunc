"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={onCopy} className="h-8 shadow-sm">
      {copied ? <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />}
      <span className={copied ? "text-emerald-500 font-medium" : "text-muted-foreground"}>
        {copied ? "Copied!" : "Copy Endpoint"}
      </span>
    </Button>
  );
}
