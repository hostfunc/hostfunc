import { getContext, requireControlPlane } from "../core/context";
import { SdkError } from "../core/types";
import type {
  DeleteResult,
  QueryResult,
  UpsertResult,
  VectorMatch,
  VectorRecord,
} from "./types";

async function postVector<T>(path: string, body: unknown): Promise<T> {
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
    throw new SdkError(
      "VECTOR_REQUEST_FAILED",
      `vector request failed (${res.status})${detail ? `: ${detail}` : ""}`,
    );
  }
  return (await res.json()) as T;
}

export function getNamespace(namespace: string): {
  upsert: (vectors: VectorRecord[]) => Promise<UpsertResult>;
  query: (embedding: number[], options?: { topK?: number; includeValues?: boolean }) => Promise<QueryResult>;
  deleteVectors: (ids: string[]) => Promise<DeleteResult>;
} {
  return {
    upsert: (vectors) => upsert(namespace, vectors),
    query: (embedding, options) => query(namespace, embedding, options),
    deleteVectors: (ids) => deleteVectors(namespace, ids),
  };
}

export async function upsert(namespace: string, vectors: VectorRecord[]): Promise<UpsertResult> {
  return postVector<UpsertResult>("/api/internal/vector/upsert", { namespace, vectors });
}

export async function query(
  namespace: string,
  embedding: number[],
  options?: { topK?: number; includeValues?: boolean },
): Promise<QueryResult> {
  const result = await postVector<{ matches?: VectorMatch[] }>(
    "/api/internal/vector/query",
    {
      namespace,
      embedding,
      topK: options?.topK ?? 8,
      includeValues: options?.includeValues ?? false,
    },
  );
  return { namespace, matches: result.matches ?? [] };
}

export async function deleteVectors(namespace: string, ids: string[]): Promise<DeleteResult> {
  return postVector<DeleteResult>("/api/internal/vector/delete", { namespace, ids });
}

export type {
  DeleteResult,
  QueryResult,
  UpsertResult,
  VectorMatch,
  VectorMetadata,
  VectorRecord,
} from "./types";
