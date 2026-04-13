import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

export interface ExecTokenPayload {
  execId: string;
  fnId: string;
  orgId: string;
  expiresAt: number;
}

function signingKey(): Buffer {
  return Buffer.from(env.EXEC_TOKEN_SECRET, "base64");
}

function base64url(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(input: string): string {
  const padded = input
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(input.length + ((4 - (input.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

export function signExecToken(payload: ExecTokenPayload): string {
  const body = base64url(
    JSON.stringify({
      e: payload.execId,
      f: payload.fnId,
      o: payload.orgId,
      x: payload.expiresAt,
    }),
  );
  const sig = base64url(createHmac("sha256", signingKey()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyExecToken(token: string): ExecTokenPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = base64url(createHmac("sha256", signingKey()).update(body).digest());
  const providedBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (providedBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(providedBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(base64urlDecode(body)) as {
      e: string;
      f: string;
      o: string;
      x: number;
    };
    if (Date.now() > parsed.x) return null;
    return {
      execId: parsed.e,
      fnId: parsed.f,
      orgId: parsed.o,
      expiresAt: parsed.x,
    };
  } catch {
    return null;
  }
}
