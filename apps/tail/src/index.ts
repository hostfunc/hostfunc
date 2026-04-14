/// <reference types="@cloudflare/workers-types" />

interface Env {
  INGEST_URL?: string;
  INGEST_TOKEN?: string;
}

interface IngestLog {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  fields?: Record<string, unknown>;
  ts?: string;
}

interface NormalizedIngestBody {
  executionId: string;
  status?: "ok" | "fn_error" | "limit_exceeded" | "infra_error";
  wallMs?: number;
  cpuMs?: number;
  memoryPeakMb?: number;
  egressBytes?: number;
  subrequestCount?: number;
  costUnits?: number;
  errorMessage?: string | null;
  logs?: IngestLog[];
  source: "tail";
  externalId: string;
  eventType: string;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (!env.INGEST_URL || !env.INGEST_TOKEN) {
      return Response.json({ error: "tail_not_configured" }, { status: 500 });
    }
    const payload = await req.json().catch(() => null);
    if (!payload) return Response.json({ error: "invalid_payload" }, { status: 400 });
    const normalized = normalizeTailPayload(payload);
    if (!normalized) return Response.json({ error: "unhandled_payload" }, { status: 400 });

    const res = await fetch(env.INGEST_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.INGEST_TOKEN}`,
      },
      body: JSON.stringify(normalized),
    });

    return Response.json({ ok: res.ok, status: res.status }, { status: res.ok ? 200 : 502 });
  },
};

function normalizeTailPayload(payload: unknown): NormalizedIngestBody | null {
  if (!payload || typeof payload !== "object") return null;
  const direct = payload as {
    executionId?: unknown;
    status?: unknown;
    wallMs?: unknown;
    logs?: unknown;
    externalId?: unknown;
  };
  if (typeof direct.executionId === "string") {
    const normalized: NormalizedIngestBody = {
      executionId: direct.executionId,
      source: "tail",
      externalId:
        typeof direct.externalId === "string"
          ? direct.externalId
          : `${direct.executionId}:tail:${Date.now()}`,
      eventType: "tail_direct",
    };
    const status = normalizeStatus(direct.status);
    if (status) normalized.status = status;
    const wallMs = toNumber(direct.wallMs);
    if (typeof wallMs === "number") normalized.wallMs = wallMs;
    const logs = normalizeLogs(direct.logs);
    if (logs) normalized.logs = logs;
    return normalized;
  }

  const eventEnvelope = payload as {
    event?: { timestamp?: unknown; logs?: unknown };
    logs?: unknown;
    metadata?: { executionId?: unknown };
    execution?: { id?: unknown };
    id?: unknown;
  };
  const executionId =
    readString(eventEnvelope.metadata?.executionId) ?? readString(eventEnvelope.execution?.id);
  if (!executionId) return null;

  const logs = normalizeLogs(eventEnvelope.event?.logs ?? eventEnvelope.logs);
  const eventId = readString(eventEnvelope.id) ?? `${executionId}:${Date.now()}`;
  const timestamp = readString(eventEnvelope.event?.timestamp);

  const normalized: NormalizedIngestBody = {
    executionId,
    source: "tail",
    externalId: `${eventId}:normalized`,
    eventType: "tail_envelope",
  };
  if (logs) {
    normalized.logs = logs;
  } else if (timestamp) {
    normalized.logs = [{ level: "info", message: "tail event received", ts: timestamp }];
  }
  return normalized;
}

function normalizeStatus(value: unknown): NormalizedIngestBody["status"] | undefined {
  if (
    value === "ok" ||
    value === "fn_error" ||
    value === "limit_exceeded" ||
    value === "infra_error"
  ) {
    return value;
  }
  return undefined;
}

function normalizeLogs(value: unknown): IngestLog[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const logs: IngestLog[] = [];
  for (const line of value) {
    if (!line || typeof line !== "object") continue;
    const entry = line as { level?: unknown; message?: unknown; ts?: unknown; fields?: unknown };
    const message = readString(entry.message);
    if (!message) continue;
    const levelRaw = readString(entry.level) ?? "info";
    const level: IngestLog["level"] =
      levelRaw === "debug" || levelRaw === "info" || levelRaw === "warn" || levelRaw === "error"
        ? levelRaw
        : "info";
    const ts = readString(entry.ts);
    const normalized: IngestLog = {
      level,
      message,
      ts: ts ?? new Date().toISOString(),
    };
    if (isObject(entry.fields)) {
      normalized.fields = entry.fields as Record<string, unknown>;
    }
    logs.push(normalized);
  }
  return logs.length > 0 ? logs : undefined;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
