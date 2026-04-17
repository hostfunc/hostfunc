import { getContext, requireControlPlane } from "../core/context";
import { SdkError } from "../core/types";
async function postAgent(path, body) {
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
        throw new SdkError("AGENT_REQUEST_FAILED", `agent request failed (${res.status})${detail ? `: ${detail}` : ""}`);
    }
    return (await res.json());
}
export async function createAgent(config) {
    return postAgent("/api/internal/agents/create", { config });
}
export async function runAgent(config) {
    return postAgent("/api/internal/agents/run", { config });
}
//# sourceMappingURL=index.js.map