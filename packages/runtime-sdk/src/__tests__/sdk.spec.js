import { describe, expect, it, vi } from "vitest";
import fn, { SdkError, secret } from "../index";
import { createAgent, runAgent } from "../agent";
import { askAi, createEmbedding } from "../ai";
import { getNamespace } from "../vector";
describe("@hostfunc/sdk core", () => {
    it("throws on invalid executeFunction slug", async () => {
        await expect(fn.executeFunction("invalid-slug")).rejects.toMatchObject({
            code: "FN_EXECUTE_FAILED",
        });
    });
    it("throws missing secret error details", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })));
        const ctx = {
            controlPlane: "https://example.hostfunc.dev",
            token: "t",
            fnId: "fn_123",
        };
        vi.stubGlobal("__hostfunc_context", ctx);
        await expect(secret.getRequired("API_KEY")).rejects.toBeInstanceOf(SdkError);
        vi.unstubAllGlobals();
    });
});
describe("@hostfunc/sdk modules", () => {
    it("calls ai endpoints", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => Response.json({
            text: "ok",
            model: "gpt-4o",
            usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
            finishReason: "stop",
        })));
        vi.stubGlobal("__hostfunc_context", { controlPlane: "https://cp.local", token: "tok" });
        const result = await askAi("hello");
        expect(result.text).toBe("ok");
        vi.stubGlobal("fetch", vi.fn(async () => Response.json({ embedding: [1, 2, 3], model: "m", usage: { inputTokens: 3 } })));
        const emb = await createEmbedding("abc");
        expect(emb.embedding).toHaveLength(3);
        vi.unstubAllGlobals();
    });
    it("surfaces integration errors from internal APIs", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
            error: "missing_secret",
            message: "Missing openai API key for AI integration",
        }), { status: 400, headers: { "content-type": "application/json" } })));
        vi.stubGlobal("__hostfunc_context", { controlPlane: "https://cp.local", token: "tok" });
        await expect(askAi("hello")).rejects.toMatchObject({
            code: "AI_REQUEST_FAILED",
        });
        vi.unstubAllGlobals();
    });
    it("calls agent and vector endpoints", async () => {
        const fetchMock = vi.fn(async (url) => {
            if (url.includes("/agents/")) {
                return Response.json({
                    id: "ag_1",
                    status: "queued",
                    startedAt: new Date().toISOString(),
                    steps: [],
                });
            }
            return Response.json({ namespace: "n1", matches: [], upserted: 1, deleted: 0 });
        });
        vi.stubGlobal("fetch", fetchMock);
        vi.stubGlobal("__hostfunc_context", { controlPlane: "https://cp.local", token: "tok" });
        const created = await createAgent({ name: "x", goal: "y" });
        const run = await runAgent({ name: "x", goal: "y" });
        expect(created.id).toBe("ag_1");
        expect(run.status).toBe("queued");
        const ns = getNamespace("docs");
        const upserted = await ns.upsert([{ id: "1", values: [0.1, 0.2] }]);
        const queried = await ns.query([0.2, 0.3], { topK: 3 });
        expect(upserted.namespace).toBe("n1");
        expect(Array.isArray(queried.matches)).toBe(true);
        vi.unstubAllGlobals();
    });
});
//# sourceMappingURL=sdk.spec.js.map