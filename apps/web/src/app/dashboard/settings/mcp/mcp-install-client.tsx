"use client";

import { DocsCodeBlock } from "@/app/docs/_components/docs-code-block";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Copy, ExternalLink, Link2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function McpInstallClient({
  endpoint,
  tokenPrefix,
  docsHref,
}: {
  endpoint: string;
  tokenPrefix: string;
  docsHref: string;
}) {
  const [endpointCopied, setEndpointCopied] = useState(false);
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
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-ink)]/60 p-4">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[var(--color-bone-faint)]">MCP Endpoint</p>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="font-mono text-sm text-[var(--color-bone)] break-all">{endpoint}</p>
          <Button
            variant="outline"
            size="sm"
            className="w-fit rounded-full border-[var(--color-border)] bg-white/[0.02] text-[var(--color-bone-muted)] hover:bg-white/[0.06] hover:text-[var(--color-bone)]"
            onClick={async () => {
              await navigator.clipboard.writeText(endpoint);
              setEndpointCopied(true);
              setTimeout(() => setEndpointCopied(false), 1500);
            }}
          >
            {endpointCopied ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Link2 className="mr-2 h-4 w-4" />}
            {endpointCopied ? "Endpoint copied" : "Copy endpoint"}
          </Button>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-[var(--color-bone-muted)]">
        Use an API token from the Tokens page and paste it into your MCP client config.
      </p>
      <DocsCodeBlock code={config} language="json" />
      <div className="flex flex-wrap gap-3">
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
          {copied ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          {copied ? "Config copied" : "Copy config"}
        </Button>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="w-fit rounded-full border-[var(--color-border)] bg-white/[0.02] text-[var(--color-bone-muted)] hover:bg-white/[0.06] hover:text-[var(--color-bone)]"
        >
          <Link href={docsHref}>
            MCP docs
            <ExternalLink className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
