export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  system?: string;
}

export interface AiResponse {
  text: string;
  model: string;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
  finishReason: "stop" | "length" | "content_filter" | "tool_calls";
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  usage: { inputTokens: number };
}

export interface StreamChunk {
  type: "delta" | "done";
  text?: string;
  done?: boolean;
}
