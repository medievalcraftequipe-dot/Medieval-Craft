# Security baseline

The first implementation includes:

- Argon2 password hashing.
- JWT access tokens tied to persisted sessions.
- Server-side session revocation on logout.
- Input validation with whitelist enforcement.
- Helmet HTTP hardening.
- CORS allowlist by environment.
- Global API rate limiting.
- No secrets committed to code.

Planned next security work:

- Email verification.
- Password reset flow.
- 2FA and recovery codes.
- Device/session management UI.
- Redis-backed distributed throttling.
- CSRF review for any cookie-based auth path.
- Upload scanning before files become public.
- Audit logs for every administrative action.
