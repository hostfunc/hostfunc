"use client";

import { Button } from "@/components/ui/button";

export default function ExecutionsError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <p className="text-sm font-medium text-destructive">Failed to load executions</p>
      <p className="mt-1 text-xs text-muted-foreground">{error.message}</p>
      <Button variant="outline" size="sm" className="mt-3" onClick={reset}>
        Retry
      </Button>
    </div>
  );
}
