"use client";

import { oneTap, useSession } from "@/lib/auth-client";
import { safeCallbackUrl } from "@/lib/safe-callback-url";
import { useEffect, useRef } from "react";

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/**
 * Google One Tap auto-prompt for the marketing site. Shows the floating Google prompt to
 * logged-out visitors so they can sign in without leaving the page. Renders nothing — the prompt
 * is drawn by Google's GSI library. No-ops when a session exists, while the session is loading, or
 * when NEXT_PUBLIC_GOOGLE_CLIENT_ID is unset (dev/CI).
 */
export function GoogleOneTap() {
  const { data: session, isPending } = useSession();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!googleClientId || isPending || session || startedRef.current) return;
    startedRef.current = true;

    // GSI / FedCM can throw (blocked third-party cookies, dismissed prompt). Never let it break
    // the page — One Tap is a convenience, the /login flow is always available as a fallback.
    void oneTap({
      callbackURL: safeCallbackUrl(null),
      onPromptNotification: () => {
        // Prompt dismissed or skipped (e.g. cooldown). Auto-prompt only — no fallback button.
      },
    }).catch(() => {
      startedRef.current = false;
    });
  }, [session, isPending]);

  return null;
}
