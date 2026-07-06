export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

/** Parse a comma-separated `level` URL param, dropping anything that isn't a known level. */
export function parseLogLevels(value: string): LogLevel[] {
  return value
    .split(",")
    .filter((level): level is LogLevel => (LOG_LEVELS as readonly string[]).includes(level));
}
