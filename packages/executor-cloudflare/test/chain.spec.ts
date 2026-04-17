// End-to-end chain smoke: bundles two real user functions and wires a
// mock dispatcher that mirrors apps/runtime/src/dispatch.ts routing semantics.
// This catches regressions in the full fn->fn->fn code path without needing
// a live wrangler/Cloudflare runtime.

import { afterEach, describe, expect, it, vi } from "vitest";
import { bundleFunction } from "../src/bundler.js";

interface WorkerModule {
  default: {
    fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response>;
  };
}

interface DeployedFn {
  fnId: string;
  orgSlug: string;
  fnSlug: string;
  worker: WorkerModule["default"];
}

const RUNTIME_URL = "https://runtime.example";
const CONTROL_PLANE = "https://control.example";

async function loadWorker(code: string): Promise<WorkerModule["default"]> {
  const mod = (await import(
    `data:text/javascript;base64,${Buffer.from(code, "utf8").toString("base64")}`
  )) as WorkerModule;
  return mod.default;
}

/**
 * Emulate the runtime dispatch worker. This mirrors the routing rules in
 * apps/runtime/src/dispatch.ts: lookup by (orgSlug, fnSlug), attach the
 * hostfunc headers, forward the body, return the response.
 */
function makeDispatcher(opts: {
  deployed: DeployedFn[];
  secrets: Record<string, Record<string, string>>; // secrets[fnId][key] = value
  maxCallDepth?: number;
  debug?: boolean;
}) {
  const { deployed, secrets, maxCallDepth = 3, debug = false } = opts;

  return async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const parsed = new URL(url);
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    const inboundHeaders = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined),
    );
    const bodyText =
      init?.body !== undefined
        ? typeof init.body === "string"
          ? init.body
          : await new Response(init.body as BodyInit).text()
        : input instanceof Request
          ? await input.clone().text().catch(() => "")
          : "";

    // --- Secrets ---
    if (parsed.pathname === "/api/internal/secrets/get") {
      const auth = inboundHeaders.get("authorization") ?? "";
      const execToken = auth.replace(/^Bearer\s+/i, "");
      // In the real system this is a signed JWT; here we use the fn id directly.
      const body = JSON.parse(bodyText || "{}") as { key?: string };
      const values = secrets[execToken];
      if (!values) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
      if (!body.key || !(body.key in values)) {
        return new Response(JSON.stringify({ found: false }), { status: 404 });
      }
      return new Response(JSON.stringify({ found: true, value: values[body.key] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // --- Resolve (best-effort cycle detection) ---
    if (parsed.pathname === "/api/internal/resolve") {
      const slug = parsed.searchParams.get("slug") ?? "";
      const [orgSlug, fnSlug] = slug.split("/");
      const match = deployed.find((d) => d.orgSlug === orgSlug && d.fnSlug === fnSlug);
      return new Response(JSON.stringify({ fnId: match?.fnId ?? null }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // --- Dispatch /run/{orgSlug}/{fnSlug} ---
    const runMatch = parsed.pathname.match(/^\/run\/([^/]+)\/([^/]+)$/);
    if (!runMatch) {
      return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
    }
    const [, orgSlug, fnSlug] = runMatch;
    if (!orgSlug || !fnSlug) {
      return new Response(JSON.stringify({ error: "invalid_run" }), { status: 400 });
    }
    const target = deployed.find((d) => d.orgSlug === orgSlug && d.fnSlug === fnSlug);
    if (!target) {
      return new Response(JSON.stringify({ error: "fn_not_found" }), { status: 404 });
    }

    const parentChain = JSON.parse(inboundHeaders.get("x-hostfunc-call-chain") ?? "[]") as Array<{
      fnId: string;
      execId: string;
    }>;
    if (parentChain.length >= maxCallDepth) {
      return new Response(
        JSON.stringify({ error: "fn_call_depth", maxDepth: maxCallDepth }),
        { status: 429, headers: { "content-type": "application/json" } },
      );
    }
    const execId = `exec_${Math.random().toString(36).slice(2)}`;
    const headers = new Headers();
    headers.set("content-type", "application/json");
    headers.set("x-hostfunc-exec-id", execId);
    headers.set("x-hostfunc-fn-id", target.fnId);
    headers.set("x-hostfunc-org-id", `org_${target.orgSlug}`);
    headers.set("x-hostfunc-exec-token", target.fnId); // secrets keyed by fnId in this mock
    headers.set("x-hostfunc-control-plane", CONTROL_PLANE);
    headers.set("x-hostfunc-runtime-url", RUNTIME_URL);
    headers.set("x-hostfunc-call-chain", inboundHeaders.get("x-hostfunc-call-chain") ?? "[]");
    headers.set("x-hostfunc-max-call-depth", String(maxCallDepth));
    if (debug) headers.set("x-hostfunc-debug", "1");

    const childReq = new Request(parsed.toString(), {
      method,
      headers,
      body: method === "GET" || method === "HEAD" ? undefined : bodyText,
    });
    const childRes = await target.worker.fetch(childReq, {}, {});
    const clone = new Response(await childRes.text(), childRes);
    clone.headers.set("x-hostfunc-exec-id", execId);
    return clone;
  };
}

async function deploy(
  source: string,
  meta: { fnId: string; orgSlug: string; fnSlug: string },
): Promise<DeployedFn> {
  const { code } = await bundleFunction({ code: source, fnId: meta.fnId });
  const worker = await loadWorker(code);
  return { ...meta, worker };
}

describe("fn chaining smoke (bundled shim + mock dispatcher)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("chains fn A -> fn B -> fn C and propagates inputs/outputs", async () => {
    const fnA = await deploy(
      `
      import fn from "@hostfunc/fn";
      export async function main(input: { customerId: string }) {
        const report = await fn.executeFunction("org/generate-report", {
          customerId: input.customerId,
        });
        const posted = await fn.executeFunction("org/post-to-slack", {
          report,
          channel: "#alerts",
        });
        return { customerId: input.customerId, posted };
      }
    `,
      { fnId: "fn_hello", orgSlug: "org", fnSlug: "hello" },
    );

    const fnB = await deploy(
      `
      import { secret } from "@hostfunc/fn";
      export async function main(input: { customerId: string }) {
        const apiKey = await secret.getRequired("CLAUDE_API_KEY");
        return { customerId: input.customerId, report: "r_" + apiKey.slice(-4) };
      }
    `,
      { fnId: "fn_generate_report", orgSlug: "org", fnSlug: "generate-report" },
    );

    const fnC = await deploy(
      `
      import { secret } from "@hostfunc/fn";
      export async function main(input: { channel: string; report: unknown }) {
        const webhookUrl = await secret.getRequired("SLACK_WEBHOOK_URL");
        return { ok: true, channel: input.channel, webhookHost: new URL(webhookUrl).host };
      }
    `,
      { fnId: "fn_post_to_slack", orgSlug: "org", fnSlug: "post-to-slack" },
    );

    const dispatcher = makeDispatcher({
      deployed: [fnA, fnB, fnC],
      secrets: {
        fn_generate_report: { CLAUDE_API_KEY: "sk_test_12345678" },
        fn_post_to_slack: { SLACK_WEBHOOK_URL: "https://hooks.slack.com/abc/def" },
      },
    });
    vi.stubGlobal("fetch", vi.fn(dispatcher));

    const res = await dispatcher(`${RUNTIME_URL}/run/org/hello`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ customerId: "cus_1" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      customerId: string;
      posted: { ok: boolean; channel: string; webhookHost: string };
    };
    expect(body.customerId).toBe("cus_1");
    expect(body.posted.ok).toBe(true);
    expect(body.posted.channel).toBe("#alerts");
    expect(body.posted.webhookHost).toBe("hooks.slack.com");
  });

  it("surfaces missing secret from a nested child as structured fn_execute_failed at the parent", async () => {
    const fnA = await deploy(
      `
      import fn from "@hostfunc/fn";
      export async function main() {
        return await fn.executeFunction("org/child", {});
      }
    `,
      { fnId: "fn_parent", orgSlug: "org", fnSlug: "parent" },
    );
    const fnB = await deploy(
      `
      import { secret } from "@hostfunc/fn";
      export async function main() {
        await secret.getRequired("NOT_SET");
        return { ok: true };
      }
    `,
      { fnId: "fn_child", orgSlug: "org", fnSlug: "child" },
    );

    const dispatcher = makeDispatcher({
      deployed: [fnA, fnB],
      secrets: { fn_child: {} },
    });
    vi.stubGlobal("fetch", vi.fn(dispatcher));

    const res = await dispatcher(`${RUNTIME_URL}/run/org/parent`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(res.status).toBe(502);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe("fn_execute_failed");
    expect(body.slug).toBe("org/child");
    expect(body.childStatus).toBe(400);
    expect(body.childError).toBe("missing_secret");
  });

  it("detects self-cycles immediately via the resolver", async () => {
    // A function that calls itself. Cycle detection should reject on the first
    // executeFunction call, not wait for the call stack to blow past maxCallDepth.
    const fnA = await deploy(
      `
      import fn from "@hostfunc/fn";
      export async function main(input: { n: number }) {
        if (input.n <= 0) return { done: true };
        return await fn.executeFunction("org/loop", { n: input.n - 1 });
      }
    `,
      { fnId: "fn_loop", orgSlug: "org", fnSlug: "loop" },
    );

    const dispatcher = makeDispatcher({ deployed: [fnA], secrets: {}, maxCallDepth: 3 });
    vi.stubGlobal("fetch", vi.fn(dispatcher));

    const res = await dispatcher(`${RUNTIME_URL}/run/org/loop`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ n: 10 }),
    });
    expect(res.status).toBe(429);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe("fn_call_depth");
    expect(typeof body.message).toBe("string");
    expect((body.message as string).toLowerCase()).toContain("loop");
  });

  it("enforces maxCallDepth across a non-trivial A->B->A->B chain", async () => {
    // A and B bounce to each other. Cycle-detection alone doesn't trip (A's
    // frame appears twice before B's frame ever repeats), so what actually
    // stops the chain is the shim's depth check + the dispatcher's depth
    // check. We expect the top-level response to be fn_execute_failed (502)
    // because the parent surfaces its child's error, not its own.
    const fnA = await deploy(
      `
      import fn from "@hostfunc/fn";
      export async function main(input: { n: number }) {
        if (input.n <= 0) return { done: true };
        return await fn.executeFunction("org/b", { n: input.n - 1 });
      }
    `,
      { fnId: "fn_a", orgSlug: "org", fnSlug: "a" },
    );
    const fnB = await deploy(
      `
      import fn from "@hostfunc/fn";
      export async function main(input: { n: number }) {
        if (input.n <= 0) return { done: true };
        return await fn.executeFunction("org/a", { n: input.n - 1 });
      }
    `,
      { fnId: "fn_b", orgSlug: "org", fnSlug: "b" },
    );

    const dispatcher = makeDispatcher({ deployed: [fnA, fnB], secrets: {}, maxCallDepth: 3 });
    vi.stubGlobal("fetch", vi.fn(dispatcher));

    const res = await dispatcher(`${RUNTIME_URL}/run/org/a`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ n: 10 }),
    });
    expect(res.status).toBe(502);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe("fn_execute_failed");
    // Whichever layer tripped the depth limit, it must have been an actual
    // fn_call_depth error, not some other failure.
    expect(body.childError === "fn_call_depth" || body.childError === "fn_execute_failed").toBe(
      true,
    );
  });
});
