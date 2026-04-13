import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./dist/schema/index.js",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://hostfunc:hostfunc@127.0.0.1:5433/hostfunc-db",
  },
  strict: true,
  verbose: true,
});
