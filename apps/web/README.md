# @hostfunc/web

The Next.js 16 application that powers the hostfunc dashboard and public landing page.

## Development

Run from the **repository root**:

```bash
# Start only this app (faster than running the full monorepo)
pnpm dev:web

# Or start everything
pnpm dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Environment Variables

Create an `.env.local` file in this directory:

```bash
cp .env.local.example .env.local
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `BETTER_AUTH_SECRET` | Secret key for session tokens |
| `NEXT_PUBLIC_APP_URL` | Public base URL for the app |
| `STRIPE_SECRET_KEY` | Stripe secret key (billing) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

## App Structure

```
src/
├── app/
│   ├── page.tsx                  # Public landing page
│   ├── login/                    # Auth pages
│   ├── docs/                     # Documentation portal
│   ├── dashboard/
│   │   ├── page.tsx              # Overview: metrics + recent executions
│   │   ├── new/                  # Create and deploy a new function
│   │   ├── functions/            # Functions list helpers
│   │   ├── [fn]/                 # Per-function detail + settings
│   │   │   └── settings/
│   │   │       └── secrets/      # Encrypted secrets vault
│   │   └── settings/             # Workspace settings
│   │       ├── page.tsx          # General (name, slug)
│   │       ├── members/          # Team management
│   │       ├── billing/          # Usage + billing
│   │       └── integrations/     # Cloud integrations
│   └── api/                      # API routes (auth, webhooks, etc.)
├── components/                   # Shared UI components
├── lib/                          # Auth client, utilities
└── server/                       # Server-side data fetchers
```

## Building for Production

```bash
# From the repo root
pnpm build
```
