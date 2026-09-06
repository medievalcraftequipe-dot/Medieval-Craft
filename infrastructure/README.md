# Tempest Light infrastructure

The main environment uses Docker Compose with Caddy, PostgreSQL, Redis, and MinIO.

- PostgreSQL is the primary relational store.
- Redis is reserved for rate limiting, presence, short-lived sessions, pub/sub, and fast queues.
- MinIO provides an S3-compatible local target for future media uploads.
- Caddy is the production reverse proxy and issues HTTPS certificates automatically.

The default `docker-compose.yml` is intended for a real host. Local development uses `docker-compose.dev.yml`.
