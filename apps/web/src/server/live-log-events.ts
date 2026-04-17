export interface StreamLine {
  ts: string;
  level: string;
  message: string;
  fields?: Record<string, unknown>;
}

export function toStreamLine(input: {
  level: string;
  message: string;
  fields?: Record<string, unknown> | null | undefined;
  ts?: Date | string | null;
}): StreamLine {
  let iso = new Date().toISOString();
  if (input.ts instanceof Date) {
    iso = input.ts.toISOString();
  } else if (typeof input.ts === "string" && input.ts.length > 0) {
    const parsed = new Date(input.ts);
    if (!Number.isNaN(parsed.getTime())) {
      iso = parsed.toISOString();
    }
  }
  return {
    ts: iso,
    level: input.level,
    message: input.message,
    ...(input.fields ? { fields: input.fields } : {}),
  };
}

export function toSseEvent(data: unknown, event?: string): string {
  const eventPrefix = event ? `event: ${event}\n` : "";
  return `${eventPrefix}data: ${JSON.stringify(data)}\n\n`;
}

export function clampBackfillLimit(value: string | null | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 120;
  return Math.max(0, Math.min(500, Math.round(parsed)));
}

