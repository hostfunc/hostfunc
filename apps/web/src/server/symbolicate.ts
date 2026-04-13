import "server-only";

import { db, schema } from "@hostfunc/db";
import { eq } from "drizzle-orm";
import { SourceMapConsumer } from "source-map";

const STACK_LINE_RE = /^(?<prefix>\s*at\s+.*\()?(?<file>[^():]+):(?<line>\d+):(?<column>\d+)\)?$/;

export async function symbolicateStack(versionId: string, stack?: string | null): Promise<string | null> {
  if (!stack) return null;
  const versionRows = await db
    .select({ sourceMap: schema.fnVersion.sourceMap })
    .from(schema.fnVersion)
    .where(eq(schema.fnVersion.id, versionId))
    .limit(1);
  const sourceMap = versionRows[0]?.sourceMap;
  if (!sourceMap) return stack;

  const consumer = await new SourceMapConsumer(sourceMap);
  try {
    const mapped = stack
      .split("\n")
      .map((line) => {
        const match = line.trim().match(STACK_LINE_RE);
        if (!match?.groups) return line;
        const lineNumber = Number(match.groups.line);
        const columnNumber = Number(match.groups.column);
        const pos = consumer.originalPositionFor({ line: lineNumber, column: columnNumber });
        if (!pos.source || pos.line == null || pos.column == null) return line;
        const prefix = match.groups.prefix ?? "at ";
        const originalName = pos.name ? `${pos.name} ` : "";
        return `${prefix}${originalName}${pos.source}:${pos.line}:${pos.column})`;
      })
      .join("\n");
    return mapped;
  } finally {
    consumer.destroy();
  }
}

export async function findVersionIdForExecution(executionId: string): Promise<string | null> {
  const rows = await db
    .select({ versionId: schema.execution.versionId })
    .from(schema.execution)
    .where(eq(schema.execution.id, executionId))
    .limit(1);
  return rows[0]?.versionId ?? null;
}
