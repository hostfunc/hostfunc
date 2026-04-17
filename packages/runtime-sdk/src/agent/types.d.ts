import type { JsonObject } from "../core/types";
export type AgentStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";
export interface AgentStep {
    id: string;
    kind: "thought" | "tool_call" | "result" | "error";
    message: string;
    ts: string;
    fields?: JsonObject;
}
export interface AgentConfig {
    name: string;
    goal: string;
    model?: string;
    maxSteps?: number;
    timeoutMs?: number;
    tools?: string[];
    input?: JsonObject;
}
export interface AgentResult {
    id: string;
    status: AgentStatus;
    output?: JsonObject;
    error?: string;
    startedAt: string;
    finishedAt?: string;
    steps: AgentStep[];
}
//# sourceMappingURL=types.d.ts.map