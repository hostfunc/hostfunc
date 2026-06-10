"use client";

import {
  deviceAuthorizationClient,
  magicLinkClient,
  organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3000",
  plugins: [magicLinkClient(), organizationClient(), deviceAuthorizationClient()],
});

export const { signIn, signOut, useSession, useActiveOrganization, organization } = authClient;
