/// <reference types="@cloudflare/workers-types" />

interface Env {
  INGEST_URL?: string;
  INGEST_TOKEN?: string;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (!env.INGEST_URL || !env.INGEST_TOKEN) {
      return Response.json({ error: "tail_not_configured" }, { status: 500 });
    }
    const payload = await req.json().catch(() => null);
    if (!payload) return Response.json({ error: "invalid_payload" }, { status: 400 });

    const res = await fetch(env.INGEST_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.INGEST_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    return Response.json({ ok: res.ok, status: res.status }, { status: res.ok ? 200 : 502 });
  },
};
