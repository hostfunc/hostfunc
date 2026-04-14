"use server";

import { db, schema, sql } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";

function compatWhere<T>(value: T): T {
  return value;
}

export async function switchActiveOrganization(orgId: string) {
  const session = await requireSession();

  const membership = await db.query.member.findFirst({
    where: and(eq(schema.member.userId, session.user.id), eq(schema.member.organizationId, orgId)),
  });

  if (!membership) {
    throw new Error("You do not have access to this workspace.");
  }

  await db
    .update(schema.session)
    .set({ activeOrganizationId: orgId })
    .where(compatWhere(sql`${schema.session.id} = ${session.session.id}`) as never);

  await db
    .update(schema.user)
    .set({ activeOrganizationId: orgId })
    .where(compatWhere(sql`${schema.user.id} = ${session.user.id}`) as never);
}
