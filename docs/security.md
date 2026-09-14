# Security baseline

This project treats the API as the source of truth. The desktop/web client can improve the user experience, but authorization, channel access, sensitive account actions, message limits, and server state updates must be enforced by the backend.

## Implemented

- Argon2id password hashing through `@node-rs/argon2`.
- Email verification and one-time password reset codes with short expiry.
- JWT access tokens tied to persisted sessions.
- Server-side session revocation on logout, password change, email change, and 2FA changes.
- Device/session listing plus individual and bulk session revocation endpoints.
- TOTP 2FA support. Stored TOTP secrets are encrypted at rest.
- 2FA required for high-risk developer star grants and desktop update publishing.
- Login and password-reset abuse tracking with temporary lockouts.
- Route-level throttling for auth, messages, voice signaling, invites, profile posts, likes, moderation actions, and update publishing.
- Global validation pipe with whitelist enforcement and forbidden unknown properties.
- Safer request body limits, with `JSON_BODY_LIMIT` and `FORM_BODY_LIMIT` overrides.
- Public user profiles no longer expose email, password hash, star balance, 2FA state, or private account flags.
- Private channels are enforced on the backend for message history, sending messages, voice presence, and voice signaling.
- Server state updates are sanitized on the backend. Clients cannot promote themselves, rewrite owners, forge boosts/likes/audit data, or grant protected permissions through edited request payloads.
- Message mention metadata is recomputed from message content and server state. Clients cannot spoof bot authors or notification recipients.
- Helmet HTTP hardening, compression, and CORS allowlist by environment.
- Security event table for critical account actions.
- Shard startup validates required secrets and retries Prisma migrations after known legacy schema repair.
- Desktop updates require HTTPS GitHub Release assets, valid semantic version, package/chunk SHA-256, rebuilt installer SHA-256, expected installer size, and Windows executable header validation before running the installer.

## Required environment

- `DATABASE_URL`
- `JWT_SECRET` with at least 32 characters
- `PUBLIC_WEB_URL`
- `CORS_ORIGIN`
- `TWO_FACTOR_SECRET_ENCRYPTION_KEY` is recommended. If absent, the API derives the encryption key from `JWT_SECRET`.

## Still Planned

- WebAuthn/Passkeys and recovery codes.
- UI for the new connected-device/session management endpoints.
- Redis-backed distributed throttling for multi-instance deployments.
- CSRF review before any future cookie-based auth flow.
- Malware scanning and media transcoding for uploads before public delivery.
- Full admin security event viewer.
- Isolated sandbox/runtime for user-authored bot code. Do not execute arbitrary JavaScript, Python, Java, shell, or system commands from users in the API process.
- Formal dependency scanning, CI secret scanning, backup restore drills, and incident response runbooks.
- Code signing certificate for the Windows installer and executable.
