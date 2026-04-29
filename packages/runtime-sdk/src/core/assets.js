import { getContext } from "./context";
import { SdkError } from "./types";
function readEnv(name) {
    const globalAny = globalThis;
    const value = globalAny.process?.env?.[name];
    return typeof value === "string" ? value : "";
}
function normalizePath(path) {
    if (typeof path !== "string" || !path.length) {
        throw new SdkError("FN_INPUT_INVALID", "asset path is required");
    }
    let p = path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
    if (!p)
        throw new SdkError("FN_INPUT_INVALID", "asset path is required");
    return p;
}
function readKvBinding() {
    const env = globalThis.FN_ASSETS_KV;
    if (env && typeof env === "object" && typeof env.get === "function") {
        return env;
    }
    return null;
}
export const assets = {
    async bytes(path) {
        const key = normalizePath(path);
        const ctx = getContext();
        const versionId = ctx.versionId || readEnv("HOSTFUNC_VERSION_ID");
        const kv = readKvBinding();
        if (kv?.get && ctx.fnId && versionId) {
            const kvKey = `${ctx.fnId}@${versionId}/${key}`;
            const buf = await kv.get(kvKey, "arrayBuffer");
            if (buf)
                return new Uint8Array(buf);
        }
        if (!ctx.controlPlane || !ctx.fnId || !versionId || !ctx.token) {
            throw new SdkError("INFRA_EXECUTE_FAILED", "asset service unavailable: missing control-plane headers or version id");
        }
        const url = `${ctx.controlPlane}/api/internal/assets/${ctx.fnId}/${versionId}/${key}`;
        const res = await fetch(url, {
            headers: { authorization: `Bearer ${ctx.token}` },
            signal: AbortSignal.timeout(10000),
        });
        if (res.status === 404)
            return null;
        if (!res.ok) {
            const detail = await res.text().catch(() => "");
            throw new SdkError("INFRA_EXECUTE_FAILED", `asset fetch failed (${res.status})${detail ? `: ${detail}` : ""}`);
        }
        const buf = await res.arrayBuffer();
        return new Uint8Array(buf);
    },
    async text(path) {
        const data = await this.bytes(path);
        if (!data)
            return null;
        return new TextDecoder().decode(data);
    },
    url(path) {
        const ctx = getContext();
        if (!ctx.controlPlane || !ctx.fnId)
            return null;
        return `${ctx.controlPlane}/api/marketplace/${ctx.fnId}/assets/${normalizePath(path)}`;
    },
};
//# sourceMappingURL=assets.js.map