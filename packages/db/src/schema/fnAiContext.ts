import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";
import { fn } from "./functions.js";
import { organization } from "./organizations.js";

export const fnAiContextKindEnum = pgEnum("fn_ai_context_kind", ["note", "url", "file"]);

export const fnAiContext = pgTable(
  "fn_ai_context",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    fnId: text("fn_id")
      .notNull()
      .references(() => fn.id, { onDelete: "cascade" }),
    createdById: text("created_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    kind: fnAiContextKindEnum("kind").notNull(),
    name: text("name").notNull(),
    /** Raw text body. For URL entries this stores the most recently fetched snippet. */
    content: text("content").notNull(),
    /** Original URL or filename; null for free-form notes. */
    sourceUri: text("source_uri"),
    /** MIME type for uploaded files (e.g. text/markdown). */
    mime: text("mime"),
    bytes: integer("bytes").notNull().default(0),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    fnIdx: index("fn_ai_context_fn_idx").on(t.fnId),
    orgIdx: index("fn_ai_context_org_idx").on(t.orgId),
  }),
);
