import {
    bigint,
    index,
    integer,
    jsonb,
    pgEnum,
    pgTable,
    text,
    timestamp,
  } from "drizzle-orm/pg-core";
  import { fn, fnVersion } from "./functions.js";
  import { organization } from "./organizations.js";
  
  export const executionStatusEnum = pgEnum("execution_status", [
    "ok",
    "fn_error",
    "limit_exceeded",
    "infra_error",
  ]);
  
  export const execution = pgTable(
    "execution",
    {
      id: text("id").primaryKey(),
      fnId: text("fn_id")
        .notNull()
        .references(() => fn.id, { onDelete: "cascade" }),
      versionId: text("version_id")
        .notNull()
        .references(() => fnVersion.id, { onDelete: "restrict" }),
      orgId: text("org_id")
        .notNull()
        .references(() => organization.id, { onDelete: "cascade" }),
  
      triggerKind: text("trigger_kind").notNull(),
      status: executionStatusEnum("status").notNull(),
  
      // Metrics
      wallMs: integer("wall_ms").notNull().default(0),
      cpuMs: integer("cpu_ms").notNull().default(0),
      memoryPeakMb: integer("memory_peak_mb").notNull().default(0),
      egressBytes: bigint("egress_bytes", { mode: "number" }).notNull().default(0),
      subrequestCount: integer("subrequest_count").notNull().default(0),
      costUnits: integer("cost_units").notNull().default(0),
  
      // Error info (null on success)
      errorCode: text("error_code"),
      errorMessage: text("error_message"),
  
      // Composition
      parentExecutionId: text("parent_execution_id"),
      callDepth: integer("call_depth").notNull().default(0),
  
      requestId: text("request_id").notNull(),
      startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
      endedAt: timestamp("ended_at", { withTimezone: true }),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => ({
      fnStartedIdx: index("execution_fn_started_idx").on(t.fnId, t.startedAt),
      orgStartedIdx: index("execution_org_started_idx").on(t.orgId, t.startedAt),
      statusIdx: index("execution_status_idx").on(t.status),
      parentIdx: index("execution_parent_idx").on(t.parentExecutionId),
      requestIdx: index("execution_request_idx").on(t.requestId),
    }),
  );
  
  export const logLevelEnum = pgEnum("log_level", ["debug", "info", "warn", "error"]);
  
  /**
   * MIGRATION TARGET: ClickHouse.
   *
   * For v0 we store execution logs in Postgres so the whole stack is one DB.
   * At ~1k exec/min with avg 5 lines each, this table hits 7M rows/day — Postgres
   * can handle it with aggressive partitioning, but ClickHouse is the right tool.
   * When we migrate, the only code that moves is the tail worker's log write path.
   */
  export const executionLog = pgTable(
    "execution_log",
    {
      id: text("id").primaryKey(),
      executionId: text("execution_id")
        .notNull()
        .references(() => execution.id, { onDelete: "cascade" }),
      orgId: text("org_id")
        .notNull()
        .references(() => organization.id, { onDelete: "cascade" }),
      ts: timestamp("ts", { withTimezone: true }).notNull(),
      level: logLevelEnum("level").notNull(),
      message: text("message").notNull(),
      fields: jsonb("fields").$type<Record<string, unknown>>(),
    },
    (t) => ({
      executionIdx: index("execution_log_execution_idx").on(t.executionId, t.ts),
      orgTsIdx: index("execution_log_org_ts_idx").on(t.orgId, t.ts),
    }),
  );