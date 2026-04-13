import { eq } from "drizzle-orm";
import { db } from "../client.js";
import { genId } from "../ids.js";
import { plan } from "../schema/billing.js";
import { PLANS } from "./plans.js";

export async function seedPlans() {
  for (const p of PLANS) {
    const existing = await db.select().from(plan).where(eq(plan.slug, p.slug)).limit(1);
    if (existing.length > 0) {
      // Update limits in place so running seed after editing PLANS takes effect.
      await db
        .update(plan)
        .set({
          name: p.name,
          priceMonthlyCents: p.priceMonthlyCents,
          limits: p.limits,
        })
        .where(eq(plan.slug, p.slug));
      console.log(`  · updated plan: ${p.slug}`);
    } else {
      await db.insert(plan).values({
        id: genId("pln"),
        slug: p.slug,
        name: p.name,
        priceMonthlyCents: p.priceMonthlyCents,
        limits: p.limits,
      });
      console.log(`  · inserted plan: ${p.slug}`);
    }
  }
}

async function main() {
  console.log("seeding plans…");
  await seedPlans();
  console.log("done");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
