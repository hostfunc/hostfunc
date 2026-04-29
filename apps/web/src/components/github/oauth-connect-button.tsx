"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

interface Props {
  returnTo: string;
  label: string;
  className?: string;
}

export function GithubOauthConnectButton({ returnTo, label, className }: Props) {
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      className={className}
      disabled={pending}
      onClick={() => {
        setPending(true);
        const popup = window.open(
          `/api/integrations/github/connect?popup=1&returnTo=${encodeURIComponent(returnTo)}`,
          "github-oauth",
          "width=560,height=720,menubar=no,toolbar=no,status=no,resizable=yes,scrollbars=yes",
        );
        const cleanup = () => {
          window.removeEventListener("message", onMessage);
          setPending(false);
        };
        const onMessage = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          if (event.data?.type !== "github-oauth-complete") return;
          cleanup();
          const nextLocation = event.data?.location as string | undefined;
          if (nextLocation) {
            window.location.href = nextLocation;
            return;
          }
          window.location.reload();
        };
        window.addEventListener("message", onMessage);
        const poll = window.setInterval(() => {
          if (popup && !popup.closed) return;
          window.clearInterval(poll);
          cleanup();
          window.location.reload();
        }, 500);
      }}
    >
      {pending ? "Waiting for GitHub..." : label}
    </Button>
  );
}
