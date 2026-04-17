# Team Members Production Checklist

## Email + Invite Flow

- [ ] `RESEND_API_KEY` configured in production.
- [ ] `EMAIL_FROM` uses a verified sender/domain in Resend.
- [ ] Invitation resend sends a real email and includes a working `join` URL.
- [ ] Magic-link sign-in emails send through the same transactional channel.
- [ ] Missing Resend key behavior is safe in non-production environments.

## Acceptance + Redirect

- [ ] Invite link opens `/join?invitationId=...`.
- [ ] Signed-out user is redirected to `/login?from=/join?...`.
- [ ] Login returns user to `from` callback path.
- [ ] Invitation acceptance redirects to `/dashboard`.
- [ ] Failure states are handled for invalid/expired/already-used invite links.

## Role Enforcement

- [ ] `member` can create functions and edit drafts only.
- [ ] `member` cannot deploy, manage secrets/triggers/packages/tokens/billing/team settings.
- [ ] `admin` can manage operational actions (deploy, secrets, triggers, package updates, team member management).
- [ ] `admin` cannot access billing/governance owner-only actions.
- [ ] `owner` retains full workspace governance permissions.

## Server-Side Security

- [ ] Permission checks are applied in server actions and API routes (not only UI visibility).
- [ ] Unauthorized requests return clear forbidden errors.
- [ ] Token, billing, trigger, and deployment routes reject insufficient roles.

## Invitation Lifecycle Safeguards

- [ ] Duplicate pending invites for the same org/email are blocked.
- [ ] Pending/resend actions validate invitation status and expiry.
- [ ] Invitation audit trail includes send, resend, acceptance, role change, and member removal events.

## Release Verification

- [ ] Existing user accepts invite and lands in the correct workspace dashboard.
- [ ] New user accepts invite, authenticates, and lands in the correct workspace dashboard.
- [ ] Member direct POST abuse checks fail for forbidden actions.
- [ ] Admin direct POST abuse checks fail for owner-only actions.
- [ ] Replay/expired/canceled invite links fail safely.
