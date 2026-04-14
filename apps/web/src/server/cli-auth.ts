import "server-only";

import { authenticateApiToken } from "./api-tokens";

export async function requireCliActor(authHeader: string | null) {
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  return authenticateApiToken(token);
}
