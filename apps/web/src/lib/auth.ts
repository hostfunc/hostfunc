import { sendTransactionalEmail } from "@/server/email";
import { db, genId, schema, sql } from "@hostfunc/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, deviceAuthorization, magicLink, organization } from "better-auth/plugins";
import { parentCookieDomain } from "./cookie-domain";
import { env } from "./env";

function compatWhere<T>(value: T): T {
  return value;
}

// Origins allowed to call the auth endpoints (app + marketing apex/www). Driven
// by ALLOWED_ORIGINS so the canonical app and brand domains all authenticate.
const trustedOrigins = Array.from(
  new Set(
    [env.BETTER_AUTH_URL, ...(env.ALLOWED_ORIGINS?.split(",") ?? [])]
      .map((origin) => origin.trim())
      .filter(Boolean),
  ),
);

// Share the session cookie across subdomains (e.g. ".hostfunc.io") so a login on
// any host works on the others. Undefined on localhost — keep host-only there.
const sessionCookieDomain = parentCookieDomain(env.BETTER_AUTH_URL);

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
      deviceCode: schema.deviceCode,
    },
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins,
  ...(sessionCookieDomain
    ? { advanced: { crossSubDomainCookies: { enabled: true, domain: sessionCookieDomain } } }
    : {}),
  emailAndPassword: { enabled: false },
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID ?? "",
      clientSecret: env.GITHUB_CLIENT_SECRET ?? "",
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendTransactionalEmail({
          to: email,
          subject: "Your hostfunc sign-in link",
          html: `
            <p>Sign in to hostfunc by clicking the link below:</p>
            <p><a href="${url}">Sign in to hostfunc</a></p>
            <p>If you did not request this, you can ignore this email.</p>
          `,
          text: `Sign in to hostfunc: ${url}\n\nIf you did not request this, you can ignore this email.`,
        });
      },
    }),
    organization({
      allowUserToCreateOrganization: true,
      organizationLimit: 1,
      sendInvitationEmail: async (data) => {
        const inviteLink = `${env.BETTER_AUTH_URL}/join?invitationId=${encodeURIComponent(data.id)}`;
        const inviterName = data.inviter.user.name || data.inviter.user.email || "A teammate";
        const orgName = data.organization.name || "your workspace";
        await sendTransactionalEmail({
          to: data.email,
          subject: `Invitation to join ${orgName} on hostfunc`,
          html: `
            <p>${inviterName} invited you to join <strong>${orgName}</strong> on hostfunc.</p>
            <p><a href="${inviteLink}">Accept invitation</a></p>
            <p>If you were not expecting this invitation, you can ignore this email.</p>
          `,
          text: [
            `${inviterName} invited you to join ${orgName} on hostfunc.`,
            `Accept invitation: ${inviteLink}`,
            "If you were not expecting this invitation, you can ignore this email.",
          ].join("\n"),
        });
      },
    }),
    // RFC 8628 device flow — powers `hostfunc.signIn` in the VS Code extension and the CLI.
    // Approval happens at `/device`; the extension then exchanges the session for an org-scoped
    // `hfn_live_` PAT via `/api/cli/device/exchange`.
    deviceAuthorization({
      expiresIn: "10m",
      interval: "5s",
      verificationUri: `${env.BETTER_AUTH_URL}/device`,
      validateClient: (clientId) => clientId === "hostfunc-vscode" || clientId === "hostfunc-cli",
    }),
    // Lets the extension present the device-approved session as `Authorization: Bearer <session>`
    // to `/api/cli/device/exchange` without cookies.
    bearer(),
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
