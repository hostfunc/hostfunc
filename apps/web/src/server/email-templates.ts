import "server-only";

/**
 * Branded, email-client-safe transactional email templates.
 *
 * Rules that keep these rendering across Gmail / Apple Mail / Outlook:
 * - table-based layout (no fl/grid/flexbox), every style INLINE (clients strip <style>),
 * - `bgcolor` attributes alongside CSS so the dark theme survives,
 * - a "bulletproof" button (padded <a> in a table cell) + a copy-paste URL fallback,
 * - a hidden preheader, and a plain-text alternative for every email.
 *
 * Intentionally has no `@/lib/env` import so it stays a pure, testable module.
 */

const COLORS = {
  ink: "#0a0908",
  inkElevated: "#131211",
  bone: "#fafaf6",
  boneMuted: "#a8a29e",
  boneFaint: "#57534e",
  amber: "#e8a317",
  border: "rgba(255,255,255,0.08)",
} as const;

const FONT_SANS =
  "'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hostfunc.io";
const LOGO_URL = `${SITE_URL}/logo-email.png`;

/** Escape text for safe interpolation into HTML element content / attributes. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface BrandedEmailOptions {
  /** Hidden inbox-preview line. */
  preheader: string;
  /** Card heading (plain text — escaped). */
  heading: string;
  /** Body HTML (already-built, trusted markup from the builders below). */
  bodyHtml: string;
  /** Primary call-to-action button. */
  cta?: { label: string; url: string };
  /** Small muted line under the CTA (plain text — escaped). */
  footnote?: string;
}

/** Render the full dark, on-brand HTML shell around a piece of body content. */
export function renderBrandedEmail(opts: BrandedEmailOptions): string {
  const { preheader, heading, bodyHtml, cta, footnote } = opts;

  const ctaBlock = cta
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 4px;">
        <tr>
          <td align="center" bgcolor="${COLORS.amber}" style="background-color:${COLORS.amber};border-radius:10px;">
            <a href="${escapeHtml(cta.url)}" target="_blank" rel="noopener" style="display:inline-block;padding:13px 30px;font-family:${FONT_SANS};font-size:15px;font-weight:600;line-height:1;color:${COLORS.ink};text-decoration:none;border-radius:10px;">${escapeHtml(cta.label)} &rarr;</a>
          </td>
        </tr>
      </table>
      <p style="margin:18px 0 0;font-family:${FONT_SANS};font-size:12px;line-height:1.6;color:${COLORS.boneFaint};">
        Or copy and paste this URL into your browser:<br>
        <a href="${escapeHtml(cta.url)}" target="_blank" rel="noopener" style="color:${COLORS.boneMuted};word-break:break-all;">${escapeHtml(cta.url)}</a>
      </p>`
    : "";

  const footnoteBlock = footnote
    ? `<p style="margin:24px 0 0;font-family:${FONT_SANS};font-size:13px;line-height:1.6;color:${COLORS.boneFaint};">${escapeHtml(footnote)}</p>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.ink};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.ink}" style="background-color:${COLORS.ink};">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;">
        <tr>
          <td align="center" style="padding:4px 0 26px;">
            <img src="${LOGO_URL}" width="68" height="59" alt="hostfunc" style="display:block;border:0;outline:none;text-decoration:none;height:59px;width:68px;">
          </td>
        </tr>
        <tr>
          <td bgcolor="${COLORS.inkElevated}" style="background-color:${COLORS.inkElevated};border:1px solid ${COLORS.border};border-radius:16px;padding:40px 40px 36px;">
            <h1 style="margin:0 0 14px;font-family:${FONT_SANS};font-size:22px;line-height:1.3;font-weight:600;color:${COLORS.bone};">${escapeHtml(heading)}</h1>
            <div style="font-family:${FONT_SANS};font-size:15px;line-height:1.65;color:${COLORS.boneMuted};">${bodyHtml}</div>
            ${ctaBlock}
            ${footnoteBlock}
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:26px 8px 0;font-family:${FONT_SANS};font-size:12px;line-height:1.6;color:${COLORS.boneFaint};">
            <a href="${SITE_URL}" target="_blank" rel="noopener" style="color:${COLORS.boneMuted};text-decoration:none;">hostfunc.io</a> &middot; tiny, composable TypeScript functions
            <br>You received this email because this address was used to sign in to or join a hostfunc workspace.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export interface BuiltEmail {
  subject: string;
  html: string;
  text: string;
}

/** Magic-link sign-in email. */
export function magicLinkEmail({ url }: { url: string }): BuiltEmail {
  return {
    subject: "Your hostfunc sign-in link",
    html: renderBrandedEmail({
      preheader: "Your secure sign-in link for hostfunc.",
      heading: "Sign in to hostfunc",
      bodyHtml:
        '<p style="margin:0;">Click the button below to securely sign in. This link is single-use and expires shortly.</p>',
      cta: { label: "Sign in to hostfunc", url },
      footnote:
        "If you didn't request this, you can safely ignore this email — no one can sign in without the link.",
    }),
    text: [
      "Sign in to hostfunc",
      "",
      `Click to securely sign in: ${url}`,
      "",
      "This link is single-use and expires shortly. If you didn't request it, you can ignore this email.",
    ].join("\n"),
  };
}

/** Organization invitation email (initial send, via better-auth). */
export function orgInviteEmail({
  inviterName,
  orgName,
  inviteLink,
}: {
  inviterName: string;
  orgName: string;
  inviteLink: string;
}): BuiltEmail {
  return {
    subject: `Invitation to join ${orgName} on hostfunc`,
    html: renderBrandedEmail({
      preheader: `${inviterName} invited you to join ${orgName} on hostfunc.`,
      heading: "You've been invited",
      bodyHtml: `<p style="margin:0;"><strong style="color:${COLORS.bone};">${escapeHtml(inviterName)}</strong> invited you to join <strong style="color:${COLORS.bone};">${escapeHtml(orgName)}</strong> on hostfunc.</p>`,
      cta: { label: "Accept invitation", url: inviteLink },
      footnote: "If you weren't expecting this invitation, you can safely ignore this email.",
    }),
    text: [
      `${inviterName} invited you to join ${orgName} on hostfunc.`,
      "",
      `Accept invitation: ${inviteLink}`,
      "",
      "If you weren't expecting this invitation, you can ignore this email.",
    ].join("\n"),
  };
}

/** Organization invitation email (resend from Members settings, includes role + expiry). */
export function orgInviteResendEmail({
  orgName,
  role,
  acceptUrl,
  expiresAt,
}: {
  orgName: string;
  role: string;
  acceptUrl: string;
  expiresAt: Date;
}): BuiltEmail {
  const expires = expiresAt.toUTCString();
  return {
    subject: `Invitation to join ${orgName} on hostfunc`,
    html: renderBrandedEmail({
      preheader: `You're invited to join ${orgName} as ${role}.`,
      heading: "You've been invited",
      bodyHtml: `<p style="margin:0;">You've been invited to join <strong style="color:${COLORS.bone};">${escapeHtml(orgName)}</strong> as <strong style="color:${COLORS.bone};">${escapeHtml(role)}</strong> on hostfunc.</p>`,
      cta: { label: "Accept invitation", url: acceptUrl },
      footnote: `This invitation expires on ${expires}.`,
    }),
    text: [
      `You've been invited to join ${orgName} as ${role} on hostfunc.`,
      "",
      `Accept invitation: ${acceptUrl}`,
      "",
      `This invitation expires on ${expires}.`,
    ].join("\n"),
  };
}
