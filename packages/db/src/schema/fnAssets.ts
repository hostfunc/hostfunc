import { customType, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { fn, fnVersion } from "./functions.js";
import { organization } from "./organizations.js";

const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return "bytea";
  },
});

export const fnAssetKindEnum = pgEnum("fn_asset_kind", ["readme", "image", "font", "other"]);

export const fnAsset = pgTable(
  "fn_asset",
  {
    id: text("id").primaryKey(),
    fnId: text("fn_id")
      .notNull()
      .references(() => fn.id, { onDelete: "cascade" }),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    kind: fnAssetKindEnum("kind").notNull().default("other"),
    mime: text("mime").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    content: bytea("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    fnPathUnique: uniqueIndex("fn_asset_fn_path_unique").on(t.fnId, t.path),
    fnIdx: index("fn_asset_fn_idx").on(t.fnId),
    orgIdx: index("fn_asset_org_idx").on(t.orgId),
  }),
);

export const fnVersionAsset = pgTable(
  "fn_version_asset",
  {
    id: text("id").primaryKey(),
    versionId: text("version_id")
      .notNull()
      .references(() => fnVersion.id, { onDelete: "cascade" }),
    fnId: text("fn_id")
      .notNull()
      .references(() => fn.id, { onDelete: "cascade" }),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    kind: fnAssetKindEnum("kind").notNull().default("other"),
    mime: text("mime").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    content: bytea("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    versionPathUnique: uniqueIndex("fn_version_asset_version_path_unique").on(t.versionId, t.path),
    fnVersionIdx: index("fn_version_asset_fn_version_idx").on(t.fnId, t.versionId),
  }),
);
