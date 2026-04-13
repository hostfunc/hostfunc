import "server-only";

import { env } from "@/lib/env";
import { isApiTokenFormat } from "@/lib/api-tokens";
import { redis } from "@/lib/redis";
import { authenticateApiToken } from "./api-tokens";

const LIMIT_PER_MINUTE = 120;

export async function authenticateMcpRequest(authHeader: string | null) {
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !isApiTokenFormat(token)) return null;
  const actor = await authenticateApiToken(token);
  if (!actor) return null;
  return actor;
}

export async function enforceMcpRateLimit(tokenId: string): Promise<boolean> {
  const key = `mcp:rate:${tokenId}:${Math.floor(Date.now() / 60_000)}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 70);
  return count <= LIMIT_PER_MINUTE;
}

export function isAllowedMcpOrigin(origin: string | null): boolean {
  if (!env.MCP_ALLOWED_ORIGINS) return true;
  if (!origin) return false;
  const allowed = env.MCP_ALLOWED_ORIGINS.split(",").map((item) => item.trim());
  return allowed.includes(origin);
}
