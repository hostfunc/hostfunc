/// <reference types="@cloudflare/workers-types" />

interface Env {
  ALLOW_HOSTS?: string;
  EGRESS_COUNTERS?: KVNamespace;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const target = req.headers.get("x-hostfunc-target-url");
    if (!target) return Response.json({ error: "missing_target_url" }, { status: 400 });

    const targetUrl = new URL(target);
    const allowlist = (env.ALLOW_HOSTS ?? "")
      .split(",")
      .map((host) => host.trim())
      .filter(Boolean);

    if (!allowlist.includes(targetUrl.hostname)) {
      return Response.json({ error: "egress_blocked", host: targetUrl.hostname }, { status: 403 });
    }

    const outboundReq = new Request(targetUrl.toString(), req);
    const outboundRes = await fetch(outboundReq);

    const execId = req.headers.get("x-hostfunc-exec-id");
    if (execId && env.EGRESS_COUNTERS && outboundRes.body) {
      const [a, b] = outboundRes.body.tee();
      void countStream(a, execId, env.EGRESS_COUNTERS);
      return new Response(b, outboundRes);
    }
    return new Response(outboundRes.body, outboundRes);
  },
};

async function countStream(
  stream: ReadableStream<Uint8Array>,
  execId: string,
  kv: KVNamespace,
): Promise<void> {
  let bytes = 0;
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value?.byteLength ?? 0;
    }
  } catch {
    return;
  } finally {
    reader.releaseLock();
  }
  try {
    const key = `egress:${execId}`;
    const current = Number((await kv.get(key)) ?? "0");
    await kv.put(key, String(current + bytes), { expirationTtl: 300 });
  } catch {
    // Best-effort.
  }
}
