# Development

This file is only for optional local development. Production deployment is documented in `docs/deployment.md` and uses the main `docker-compose.yml`.

## Commands

```bash
pnpm install
cp .env.development.example .env.development
docker compose -f docker-compose.dev.yml up -d postgres redis minio
pnpm db:generate
pnpm db:migrate
pnpm dev:api
pnpm dev:web
```

Optional apps:

```bash
pnpm dev:admin
pnpm dev:desktop
```

The desktop app uses Electron and does not require Tauri or Rust.

## Environment

Use `.env.development.example` as the source for local variables. Save the real local file as `.env.development`.

For local testing, leave `SMTP_HOST` empty. The API prints the activation link in its logs instead of sending a real email. In production, configure SMTP in `.env.production`.

## Database

The Prisma schema lives at `backend/api/prisma/schema.prisma`. It already includes the core entities required by the product roadmap, even when their application modules are still pending.

Run this after schema changes:

```bash
pnpm db:migrate
```

## Testing

```bash
pnpm test
```

The first tests cover password policy and permission behavior. API integration tests should be added as each module becomes active.
