import "server-only";

import { randomBytes } from "node:crypto";
import argon2 from "argon2";

const TOKEN_PREFIX = "hfn_live_";

export function generateApiToken(): { token: string; prefix: string } {
  const raw = randomBytes(24).toString("base64url");
  const token = `${TOKEN_PREFIX}${raw}`;
  const prefix = token.slice(0, 20);
  return { token, prefix };
}

export async function hashApiToken(token: string): Promise<string> {
  return argon2.hash(token, { type: argon2.argon2id });
}

export async function verifyApiToken(token: string, hashed: string): Promise<boolean> {
  try {
    return await argon2.verify(hashed, token);
  } catch {
    return false;
  }
}

export function isApiTokenFormat(value: string): boolean {
  return value.startsWith(TOKEN_PREFIX) && value.length > TOKEN_PREFIX.length + 12;
}
