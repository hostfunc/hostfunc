# Better Auth setup (GitHub + Google)

This project uses Better Auth with Next.js route handlers.

## 1) Required environment variables

Set these in `apps/web/.env.local` for local development:

- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_BETTER_AUTH_URL`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Use `apps/web/.env.example` as the safe template.

Generate a secret with:

```bash
openssl rand -base64 32
```

## 2) Local callback URLs

When running at `http://localhost:3000`, configure:

- GitHub callback: `http://localhost:3000/api/auth/callback/github`
- Google callback: `http://localhost:3000/api/auth/callback/google`

## 3) Production callback URLs

Replace `https://your-domain` with your deployed app domain and configure:

- GitHub callback: `https://your-domain/api/auth/callback/github`
- Google callback: `https://your-domain/api/auth/callback/google`

Also set:

- `BETTER_AUTH_URL=https://your-domain`
- `NEXT_PUBLIC_BETTER_AUTH_URL=https://your-domain`

## 4) Provider setup quick reference

### GitHub OAuth App

- Homepage URL: app origin (`http://localhost:3000` in dev)
- Authorization callback URL: `.../api/auth/callback/github`

### Google OAuth Client (Web application)

- Authorized JavaScript origins: app origin(s)
- Authorized redirect URI: `.../api/auth/callback/google`

## 5) Smoke test social setup

Run:

```bash
pnpm --filter @hostfunc/web smoke:auth-social
```

Expected checks:

- `/login` returns success
- login page includes social login labels
- required social env vars are set
- callback URLs resolve to expected Better Auth paths
