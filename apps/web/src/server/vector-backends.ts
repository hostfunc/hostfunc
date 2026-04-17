import "server-only";

import type { ResolvedVectorConfig } from "./integrations";

interface VectorRecord {
  id: string;
  values: number[];
  metadata?: Record<string, unknown>;
}

interface QueryInput {
  namespace: string;
  vector: number[];
  topK?: number;
}

async function externalCall(baseUrl: string, path: string, body: unknown) {
  const res = await fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`external_http_error:${res.status}:${JSON.stringify(json)}`);
  }
  return json;
}

export async function vectorUpsert(config: ResolvedVectorConfig, namespace: string, vectors: VectorRecord[]) {
  const errors: string[] = [];
  for (const backend of config.backends) {
    try {
      if (backend.kind === "external_http") {
        const data = await externalCall(backend.serviceUrl, "/upsert", { namespace, vectors });
        return { ...data, backend: backend.kind };
      }
      throw new Error(
        `postgres_backend_not_supported:${backend.databaseUrl}. Use external_http or add postgres driver support.`,
      );
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "unknown_error");
    }
  }
  throw new Error(`vector_upsert_failed:${errors.join("|")}`);
}

export async function vectorQuery(config: ResolvedVectorConfig, input: QueryInput) {
  const errors: string[] = [];
  for (const backend of config.backends) {
    try {
      if (backend.kind === "external_http") {
        const data = await externalCall(backend.serviceUrl, "/query", input);
        return { ...data, backend: backend.kind };
      }
      throw new Error(
        `postgres_backend_not_supported:${backend.databaseUrl}. Use external_http or add postgres driver support.`,
      );
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "unknown_error");
    }
  }
  throw new Error(`vector_query_failed:${errors.join("|")}`);
}

export async function vectorDelete(config: ResolvedVectorConfig, namespace: string, ids: string[]) {
  const errors: string[] = [];
  for (const backend of config.backends) {
    try {
      if (backend.kind === "external_http") {
        const data = await externalCall(backend.serviceUrl, "/delete", { namespace, ids });
        return { ...data, backend: backend.kind };
      }
      throw new Error(
        `postgres_backend_not_supported:${backend.databaseUrl}. Use external_http or add postgres driver support.`,
      );
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "unknown_error");
    }
  }
  throw new Error(`vector_delete_failed:${errors.join("|")}`);
}
