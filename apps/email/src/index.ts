/// <reference types="@cloudflare/workers-types" />

interface Env {
  CONTROL_PLANE_URL: string;
  CONTROL_PLANE_TOKEN: string;
}

const MAX_RAW_BYTES = 512 * 1024;

function extractTextFromRawMime(raw: string, maxScan: number): string {
  const slice = raw.slice(0, maxScan);
  const sep = slice.search(/\r\n\r\n|\n\n/);
  if (sep < 0) return "";
  return slice
    .slice(sep)
    .replace(/^[\r\n]+/, "")
    .trim();
}

export default {
  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    const reader = message.raw.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.length;
      if (total > MAX_RAW_BYTES) {
        message.setReject("message too large");
        return;
      }
      chunks.push(value);
    }
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }
    const raw = new TextDecoder("utf-8", { fatal: false, ignoreBOM: true }).decode(merged);
    const text = extractTextFromRawMime(raw, Math.min(raw.length, 256 * 1024));

    const headers: Record<string, string> = {};
    message.headers.forEach((value, key) => {
      headers[key] = value;
    });
    await fetch(`${env.CONTROL_PLANE_URL}/api/internal/email/inbound`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.CONTROL_PLANE_TOKEN}`,
      },
      body: JSON.stringify({
        to: message.to,
        from: message.from,
        subject: message.headers.get("subject") ?? "",
        text,
        rawSize: total,
        headers,
      }),
    });
  },
};
