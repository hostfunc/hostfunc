"use client";

import {
  deviceAuthorizationClient,
  magicLinkClient,
  oneTapClient,
  organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Call the auth API on the same origin the page is served from (app/www/apex) so
// there's no cross-origin request and no CORS. Sessions are shared across these
// hosts via the cross-subdomain cookie configured in auth.ts. Falls back to the
// configured URL during SSR/prerender where there's no window.
const authBaseURL =
  typeof window !== "undefined"
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3000");

// Public Google client id for One Tap. Inlined by Next at build time; empty in dev/CI where the
// `<GoogleOneTap />` component gates on its presence, so the One Tap action is never invoked.
const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

export const authClient = createAuthClient({
  baseURL: authBaseURL,
  plugins: [
    magicLinkClient(),
    organizationClient(),
    deviceAuthorizationClient(),
    oneTapClient({ clientId: googleClientId }),
  ],
});

export const { signIn, signOut, useSession, useActiveOrganization, organization, oneTap } =
  authClient;
