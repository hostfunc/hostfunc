import type { JsonObject } from "../core/types";
export interface VectorMetadata extends JsonObject {
}
export interface VectorRecord {
    id: string;
    values: number[];
    metadata?: VectorMetadata;
}
export interface VectorMatch {
    id: string;
    score: number;
    metadata?: VectorMetadata;
    values?: number[];
}
export interface QueryResult {
    namespace: string;
    matches: VectorMatch[];
}
export interface UpsertResult {
    namespace: string;
    upserted: number;
}
export interface DeleteResult {
    namespace: string;
    deleted: number;
}
//# sourceMappingURL=types.d.ts.map