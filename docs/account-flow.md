# Account flow

## First access

1. The user opens Tempest Light.
2. The user creates an account with email, nick, birth date, and password.
3. The API creates the account without a session.
4. The API sends an activation email with a 24-hour link.
5. The user clicks the link.
6. The web app calls `POST /api/v1/auth/verify-email`.
7. After activation, the user can log in with nick or email plus password.

## Production email

Configure SMTP in `.env.production`:

```text
SMTP_HOST=smtp.seu-dominio.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=no-reply@seu-dominio.com
SMTP_PASS=replace-with-the-email-password
SMTP_FROM=Tempest Light <no-reply@seu-dominio.com>
```

Without SMTP, the API logs the activation link for development. Production should use real SMTP before public launch.

## Profile

Authenticated users can update display name, avatar URL, bio, and custom status through `PATCH /api/v1/auth/me`.

## Channels

The schema now has `Channel.isPrivate`. The current client already distinguishes public and private text/voice channels visually. Public text channels allow writing; private channels are blocked until the permissions module is implemented.
