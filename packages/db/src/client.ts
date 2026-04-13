import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

const connectionString = process.env.DATABASE_URL ?? "postgres://127.0.0.1:5432/hostfunc-db";

// Reuse the connection across hot reloads in dev.
declare global {
  // eslint-disable-next-line no-var
  var __hostfunc_db__: ReturnType<typeof postgres> | undefined;
}

const client = globalThis.__hostfunc_db__ ?? postgres(connectionString, { max: 10 });
if (process.env.NODE_ENV !== "production") {
  globalThis.__hostfunc_db__ = client;
}

export const db = drizzle(client, { schema });
export type Database = typeof db;
export { schema };
