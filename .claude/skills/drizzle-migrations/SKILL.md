---
name: drizzle-migrations
description: This skill should be used whenever Claude is changing database schema files under packages/db/src or doing work that requires a migration in the hostfunc monorepo. It covers the generate → review → migrate flow, the local Postgres port quirk, and the rule against editing shipped migrations. Trigger this whenever the user mentions database schema, migrations, drizzle, a new table or column, an index, or "db".
---

# drizzle-migrations

## When to use

- Adding, renaming, or removing a column or table.
- Adding or modifying an index.
- Changing a default value or nullability.
- Writing or running migrations against the local DB.
- Anything that touches `packages/db/src/*.ts` schema files.

## Steps

1. **Find the right schema file.** Schemas are split by domain in `packages/db/src/`:
   - `auth.ts` — `user`, `session`, `account`, `verification` (Better Auth)
   - `organizations.ts` — `organization`, `member`, `invitation`
   - `functions.ts` — `fn`, `fn_version`, `fn_draft`
   - `triggers.ts` — `trigger`
   - `executions.ts` — `execution` (high-cardinality, append-heavy)
   - `secrets.ts` — `secret` (envelope-encrypted)
   - `billing.ts` — `billing`, `subscription`, `usage`
   - `github.ts` — `github_repo`, `github_sync`
   - `marketplace.ts` — `marketplace_entry`

   Edit the file that owns the table you're changing.

2. **Make sure local infra is running.**
   ```
   pnpm infra:up
   ```
   This brings up Postgres on **port 5433** (not 5432) and Redis. Stop with `pnpm infra:down`. Wipe data with `pnpm infra:reset`.

3. **Generate the migration.**
   ```
   pnpm db:generate
   ```
   Drizzle-kit diffs the schema against the introspected DB state and writes a new SQL file to `packages/db/migrations/<timestamp>_<name>.sql`. Review every line — generated SQL is not gospel.

4. **Review the generated SQL.**
   - Adding a NOT NULL column to an existing table without a default will fail in prod if there are existing rows. Add a default or do a 3-step migration (add nullable → backfill → set NOT NULL).
   - `DROP COLUMN` and `DROP TABLE` are destructive — confirm with the user, and consider a rename-and-deprecate path instead.
   - New indexes on large tables (`execution` especially) can lock writes. Use `CREATE INDEX CONCURRENTLY` in the generated SQL by hand if the table is hot.
   - Verify FK constraints and `ON DELETE` semantics match the intent.

5. **Apply the migration locally.**
   ```
   pnpm db:migrate
   ```
   This runs against the local Postgres on port 5433. To inspect after:
   ```
   pnpm db:studio
   ```

6. **If something is wrong**, delete the unshipped migration file and re-`pnpm db:generate`. **Never edit a migration that has been merged to `main`** — the production DB has already applied it, and changing it in-place creates schema drift. Write a new migration to correct it.

7. **Seed data.** `pnpm db:seed` populates dev data via `packages/db/src/seed/`. Add seed entries when introducing a new table that needs sample data for the dashboard to render meaningfully.

8. **Commit the migration with the schema change.** They must travel together. Use a `feat(db):` or `fix(db):` commit scope.

## Conventions

- All tables have `id`, `createdAt`, `updatedAt`. Multi-tenant tables have `organizationId`.
- Use Drizzle's `pgTable(...)`, `text()`, `timestamp({ withTimezone: true })`, `boolean()`, `integer()`, `jsonb()`, `uuid()`. Prefer `uuid()` over `serial`/`bigserial` for primary keys on user-facing entities.
- Foreign keys: explicit `.references(() => other.id, { onDelete: "cascade" | "set null" })`. Don't rely on default behaviour.
- Index naming: Drizzle-kit names indexes for you; if you name one explicitly, use `<table>_<columns>_idx`.
- Zod schemas for the same shape go in `packages/db/src/<area>.ts` alongside the table definition when there's an API surface that needs runtime validation.

## Gotchas

- **Postgres port is 5433.** If `pnpm db:migrate` says it can't connect to `:5432`, your `DATABASE_URL` is wrong. The dev URL should target `:5433`.
- **The `execution` table is high-cardinality and append-heavy.** Adding columns is fine. Adding indexes is risky in prod — talk to the user before merging. Backfilling on this table can take a long time.
- **Better Auth owns the `user`, `session`, `account`, `verification` tables.** Don't rename their columns; better-auth expects specific names. If you need extra user fields, add them and configure better-auth to pick them up — don't rename the existing ones.
- **`organization` schema has an `organizationLimit: 1`** in the auth config — be aware before adding logic that assumes a user can have many active orgs.
- **`secret` table** stores envelope-encrypted ciphertext (DEK + ciphertext pointers). The plaintext never lives in the DB. Don't introduce a "plaintext" column.
- **Migrations are sequential and timestamped** — don't reorder them. Don't squash unless explicitly approved.

## Done means

- The schema file is updated and the generated migration SQL is reviewed.
- `pnpm db:migrate` ran clean against local Postgres (port 5433).
- `pnpm db:studio` shows the expected new state, or `pnpm --filter @hostfunc/db typecheck` is clean.
- If the change has prod-impact risk (NOT NULL backfill, large index, destructive drop), it's been flagged to the user with a recommended rollout (3-step, `CONCURRENTLY`, etc.).
- The migration and schema change are in the same commit, scoped `feat(db):` or `fix(db):`.
