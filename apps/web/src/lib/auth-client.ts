"use client";

import {
  deviceAuthorizationClient,
  magicLinkClient,
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

export const authClient = createAuthClient({
  baseURL: authBaseURL,
  plugins: [magicLinkClient(), organizationClient(), deviceAuthorizationClient()],
});

export const { signIn, signOut, useSession, useActiveOrganization, organization } = authClient;
