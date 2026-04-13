import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "./client.js";

async function main() {
  console.log("running migrations…");
  await migrate(db, { migrationsFolder: "./migrations" });
  console.log("done");
  process.exit(0);
}

main().catch((e) => {
  const err = e as { code?: string; message?: string };
  if (err?.code === "28000" || err?.message?.includes("role")) {
    console.error("Database auth failed.");
    console.error(
      "Set DATABASE_URL to a valid local/user DB, e.g. DATABASE_URL=postgres://<user>:<pass>@127.0.0.1:5432/<db>",
    );
  }
  console.error(e);
  process.exit(1);
});
