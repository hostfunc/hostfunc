"use client";

import { DocsCodeBlock } from "@/app/docs/_components/docs-code-block";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function McpInstallClient({
  endpoint,
  tokenPrefix,
}: {
  endpoint: string;
  tokenPrefix: string;
}) {
  const [copied, setCopied] = useState(false);
  const config = JSON.stringify(
    {
      mcpServers: {
        hostfunc: {
          type: "http",
          url: endpoint,
          headers: {
            Authorization: `Bearer ${tokenPrefix}...`,
          },
        },
      },
    },
    null,
    2,
  );

  return (
    <div className="space-y-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-6 shadow-xl">
      <p className="text-sm leading-relaxed text-[var(--color-bone-muted)]">
        Use an API token from the Tokens page and paste it into your MCP client config.
      </p>
      <DocsCodeBlock code={config} language="json" />
      <Button
        variant="outline"
        size="sm"
        className="w-fit rounded-full border-[var(--color-border)] bg-white/[0.02] text-[var(--color-bone-muted)] hover:bg-white/[0.06] hover:text-[var(--color-bone)]"
        onClick={async () => {
          await navigator.clipboard.writeText(config);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? "Copied" : "Copy config"}
      </Button>
    </div>
  );
}
