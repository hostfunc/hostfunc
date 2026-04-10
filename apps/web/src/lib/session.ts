import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db, schema } from "@hostfunc/db";
import { eq } from "drizzle-orm";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/**
 * The active org is stored on the session by Better Auth. Every tenant-scoped
 * query in the app should use this value, never the user id directly.
 */
export async function requireActiveOrg() {
    const session = await requireSession();
    
    // Try to get it from the session token first
    let orgId = session.session.activeOrganizationId;
  
    // IF IT'S MISSING (The Hook didn't run or column was missing):
    if (!orgId) {
      const membership = await db.query.member.findFirst({
        where: (member, { eq }) => eq(member.userId, session.user.id),
      });
  
      if (membership) {
        orgId = membership.organizationId;
        
        // Patch the session and user in the background so next time it's there
        await db.update(schema.session)
          .set({ activeOrganizationId: orgId })
          .where(eq(schema.session.id, session.session.id));
          
        await db.update(schema.user)
          .set({ activeOrganizationId: orgId })
          .where(eq(schema.user.id, session.user.id));
      } else {
         throw new Error("No active organization found for this user.");
      }
    }
  
    return { session, orgId };
  }