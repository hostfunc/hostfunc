"use server";

import { db, genId, schema, sql } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/session";

const createWorkspaceSchema = z.object({
  name: z.string().min(2, "Workspace name must be at least 2 characters").max(64),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(64)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  logo: z.string().optional(),
});

function compatWhere<T>(value: T): T {
  return value;
}

// biome-ignore lint/suspicious/noExplicitAny: Standard internal state type
export async function createWorkspaceAction(_prevState: any, formData: FormData) {
  const session = await requireSession();
  const parsed = createWorkspaceSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    logo: formData.get("logo"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const ownedWorkspaces = await db
    .select({
      orgId: schema.member.organizationId,
      planSlug: schema.plan.slug,
    })
    .from(schema.member)
    .innerJoin(schema.subscription, eq(schema.subscription.orgId, schema.member.organizationId))
    .innerJoin(schema.plan, eq(schema.plan.id, schema.subscription.planId))
    .where(and(eq(schema.member.userId, session.user.id), eq(schema.member.role, "owner")));
  const hasPaidOwnedWorkspace = ownedWorkspaces.some((workspace) => workspace.planSlug !== "free");
  if (!hasPaidOwnedWorkspace && ownedWorkspaces.length >= 1) {
    return {
      error: {
        name: ["Free tier allows one workspace. Upgrade a workspace plan to create more."],
      },
    };
  }

  const slugExists = await db.query.organization.findFirst({
    where: eq(schema.organization.slug, parsed.data.slug),
    columns: { id: true },
  });
  if (slugExists) {
    return { error: { slug: ["Slug is already taken. Try another workspace URL."] } };
  }

  const orgId = genId("org");
  await db.insert(schema.organization).values({
    id: orgId,
    name: parsed.data.name,
    slug: parsed.data.slug,
    logo: parsed.data.logo,
  });

  await db.insert(schema.member).values({
    id: genId("mem"),
    organizationId: orgId,
    userId: session.user.id,
    role: "owner",
  });

  const freePlan = await db.query.plan.findFirst({
    where: eq(schema.plan.slug, "free"),
    columns: { id: true },
  });
  if (freePlan) {
    const existingSubscription = await db.query.subscription.findFirst({
      where: and(eq(schema.subscription.orgId, orgId), eq(schema.subscription.planId, freePlan.id)),
      columns: { id: true },
    });
    if (!existingSubscription) {
      await db.insert(schema.subscription).values({
        id: genId("sub"),
        orgId,
        planId: freePlan.id,
        status: "active",
      });
    }
  }

  await db
    .update(schema.session)
    .set({ activeOrganizationId: orgId })
    .where(compatWhere(sql`${schema.session.id} = ${session.session.id}`) as never);

  await db
    .update(schema.user)
    .set({ activeOrganizationId: orgId })
    .where(compatWhere(sql`${schema.user.id} = ${session.user.id}`) as never);

  redirect("/dashboard");
}
