/// <reference types="@cloudflare/workers-types" />

interface Env {
  ALLOW_HOSTS?: string;
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
    return new Response(outboundRes.body, outboundRes);
  },
};
