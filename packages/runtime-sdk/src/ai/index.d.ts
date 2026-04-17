import type { AiMessage, AiOptions, AiResponse, EmbeddingResult, StreamChunk } from "./types";
export declare function askAi(prompt: string | AiMessage[], options?: AiOptions): Promise<AiResponse>;
export declare function streamAi(prompt: string | AiMessage[], options?: AiOptions): AsyncGenerator<StreamChunk, void, void>;
export declare function createEmbedding(text: string, options?: Pick<AiOptions, "model">): Promise<EmbeddingResult>;
export type { AiMessage, AiOptions, AiResponse, EmbeddingResult, StreamChunk };
//# sourceMappingURL=index.d.ts.map