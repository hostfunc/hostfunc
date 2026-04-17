import { getContext, requireControlPlane } from "../core/context";
import { SdkError } from "../core/types";
async function postVector(path, body) {
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
        throw new SdkError("VECTOR_REQUEST_FAILED", `vector request failed (${res.status})${detail ? `: ${detail}` : ""}`);
    }
    return (await res.json());
}
export function getNamespace(namespace) {
    return {
        upsert: (vectors) => upsert(namespace, vectors),
        query: (embedding, options) => query(namespace, embedding, options),
        deleteVectors: (ids) => deleteVectors(namespace, ids),
    };
}
export async function upsert(namespace, vectors) {
    return postVector("/api/internal/vector/upsert", { namespace, vectors });
}
export async function query(namespace, embedding, options) {
    const result = await postVector("/api/internal/vector/query", {
        namespace,
        embedding,
        topK: options?.topK ?? 8,
        includeValues: options?.includeValues ?? false,
    });
    return { namespace, matches: result.matches ?? [] };
}
export async function deleteVectors(namespace, ids) {
    return postVector("/api/internal/vector/delete", { namespace, ids });
}
//# sourceMappingURL=index.js.map