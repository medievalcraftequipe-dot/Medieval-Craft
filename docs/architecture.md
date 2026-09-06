# Architecture

Tempest Light starts as a modular monolith instead of a premature microservice fleet. This keeps transactions, authentication, permissions, and development velocity sane while still using module boundaries that can become separate services later.

## Decision summary

- NestJS was chosen for the backend because modules, guards, pipes, dependency injection, and testing tools match the security-heavy requirements.
- Prisma was chosen for the first database layer because the schema is explicit, migrations are repeatable, and TypeScript types reduce data-access mistakes.
- PostgreSQL is the source of truth for accounts, servers, channels, messages, roles, permissions, invites, moderation, audit logs, bots, and notifications.
- Redis is reserved for high-churn data and coordination: presence, rate limiting, websocket fanout, temporary sessions, pub/sub, and fast queues.
- Electron was selected for desktop packaging so users can install Tempest Light through a regular Windows `.exe` without Tauri or Rust.
- The desktop build includes a launcher layer for server checks, updates, and then opening the client UI.
- The main Docker Compose file targets a real host with Caddy-managed HTTPS; local-only services are isolated in `docker-compose.dev.yml`.

## Module map

- `backend/api/src/modules/auth`: registration, email activation, login, profile updates, logout, JWT issuance, and session validation.
- `backend/api/src/modules/users`: user creation and public profile lookup.
- `backend/api/src/modules/health`: dependency health checks.
- `backend/api/src/common/mail`: SMTP delivery with log fallback while email hosting is not configured.
- `backend/api/src/common/prisma`: database client lifecycle.
- `backend/api/src/common/redis`: Redis connection lifecycle.
- `packages/types`: DTO and API response contracts.
- `packages/shared`: permission constants and shared domain helpers.
- `packages/api-client`: browser-safe HTTP client.
- `packages/ui`: shared React primitives.

## Service split path

The initial API can later split into these deployable services without changing product boundaries:

- Auth and identity.
- User graph and friends.
- Server/channel management.
- Messages and search indexing.
- Realtime gateway.
- Media processing.
- Notifications.
- Voice/video signaling.
- Moderation and audit.
- Bot gateway and public API.
