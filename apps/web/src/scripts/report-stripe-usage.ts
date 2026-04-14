import { reportUnreportedExecutionUsage } from "../server/billing-usage.js";

async function main() {
  await reportUnreportedExecutionUsage(24);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
