export const DEFAULT_MAX_BODY_BYTES = 1_048_576; // 1 MiB

/**
 * Parses the MAX_BODY_BYTES wrangler var; falls back to the default for
 * missing, non-numeric, or non-positive values.
 */
export function resolveMaxBodyBytes(raw: string | undefined): number {
  if (!raw) return DEFAULT_MAX_BODY_BYTES;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MAX_BODY_BYTES;
  return parsed;
}

export type BodyReadResult = { ok: true; text: string } | { ok: false; reason: "too_large" };

/**
 * Reads the request body, rejecting early on a Content-Length above the cap
 * and aborting mid-stream if the actual bytes exceed it. Content-Length is
 * client-supplied and absent on chunked bodies, so both checks are required.
 */
export async function readBodyWithLimit(req: Request, maxBytes: number): Promise<BodyReadResult> {
  const contentLength = Number.parseInt(req.headers.get("content-length") ?? "", 10);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return { ok: false, reason: "too_large" };
  }
  if (!req.body) return { ok: true, text: "" };

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return { ok: false, reason: "too_large" };
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, text: new TextDecoder().decode(merged) };
}
