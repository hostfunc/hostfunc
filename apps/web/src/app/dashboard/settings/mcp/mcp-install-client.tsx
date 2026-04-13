"use client";

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
    <div className="space-y-4 rounded-lg border border-border p-4">
      <p className="text-sm text-muted-foreground">
        Use an API token from the Tokens page and paste it into your MCP client config.
      </p>
      <pre className="overflow-auto rounded-md bg-muted/20 p-3 text-xs">{config}</pre>
      <Button
        variant="outline"
        size="sm"
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
