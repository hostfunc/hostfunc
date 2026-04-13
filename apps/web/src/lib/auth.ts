import { db, genId, schema, sql } from "@hostfunc/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink, organization } from "better-auth/plugins";
import { env } from "./env";

function compatWhere<T>(value: T): T {
  return value;
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      organization: schema.organization,
      member: schema.member,
      invitation: schema.invitation,
    },
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: { enabled: false },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        if (env.RESEND_API_KEY) {
          console.log(`[email] would send magic link to ${email}`);
        } else {
          console.log("\n────────────────────────────────────────");
          console.log(`🔗 Magic link for ${email}:`);
          console.log(url);
          console.log("────────────────────────────────────────\n");
        }
      },
    }),
    organization({
      allowUserToCreateOrganization: true,
      organizationLimit: 5,
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const orgId = genId("org");
          const slug = `user-${user.id.slice(-12).toLowerCase()}`;

          await db.insert(schema.organization).values({
            id: orgId,
            name: `${user.name || user.email.split("@")[0]}'s workspace`,
            slug,
          });

          await db.insert(schema.member).values({
            id: genId("mem"),
            organizationId: orgId,
            userId: user.id,
            role: "owner",
          });

          // Free subscription by default
          const free = await db
            .select()
            .from(schema.plan)
            .where(compatWhere(sql`${schema.plan.slug} = ${"free"}`) as never)
            .limit(1);

          if (free[0]) {
            await db.insert(schema.subscription).values({
              id: genId("sub"),
              orgId,
              planId: free[0].id,
              status: "active",
            });
          }
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          // On new session, set the active org to the user's first membership.
          const memberships = await db
            .select({ orgId: schema.member.organizationId })
            .from(schema.member)
            .where(compatWhere(sql`${schema.member.userId} = ${session.userId}`) as never)
            .limit(1);
          return {
            data: {
              ...session,
              activeOrganizationId: memberships[0]?.orgId ?? null,
            },
          };
        },
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
});

export type Session = typeof auth.$Infer.Session;
