import { getContext, requireControlPlane } from "../core/context";
import { SdkError } from "../core/types";
async function postJson(path, body) {
    const controlPlane = requireControlPlane();
    const token = getContext().token;
    const res = await fetch(`${controlPlane}${path}`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new SdkError("AI_REQUEST_FAILED", `ai request failed (${res.status})${detail ? `: ${detail}` : ""}`);
    }
    return (await res.json());
}
export async function askAi(prompt, options) {
    return postJson("/api/internal/ai/ask", { prompt, options: options ?? {} });
}
export async function* streamAi(prompt, options) {
    const result = await postJson("/api/internal/ai/ask", {
        prompt,
        options: options ?? {},
    });
    yield { type: "delta", text: result.text };
    yield { type: "done", done: true };
}
export async function createEmbedding(text, options) {
    return postJson("/api/internal/ai/embed", { text, options: options ?? {} });
}
//# sourceMappingURL=index.js.map