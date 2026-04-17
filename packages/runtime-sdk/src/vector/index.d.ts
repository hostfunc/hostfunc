import type { DeleteResult, QueryResult, UpsertResult, VectorRecord } from "./types";
export declare function getNamespace(namespace: string): {
    upsert: (vectors: VectorRecord[]) => Promise<UpsertResult>;
    query: (embedding: number[], options?: {
        topK?: number;
        includeValues?: boolean;
    }) => Promise<QueryResult>;
    deleteVectors: (ids: string[]) => Promise<DeleteResult>;
};
export declare function upsert(namespace: string, vectors: VectorRecord[]): Promise<UpsertResult>;
export declare function query(namespace: string, embedding: number[], options?: {
    topK?: number;
    includeValues?: boolean;
}): Promise<QueryResult>;
export declare function deleteVectors(namespace: string, ids: string[]): Promise<DeleteResult>;
export type { DeleteResult, QueryResult, UpsertResult, VectorMatch, VectorMetadata, VectorRecord, } from "./types";
//# sourceMappingURL=index.d.ts.map