# Authentication

PBcoms uses Better Auth with its official Drizzle adapter and PostgreSQL. Identity is platform-wide: the authentication `user` table has no organisation identifier, allowing PB-004 and later tickets to model many-to-many organisation membership separately.

## Flows and routes

- `/register` validates name, normalised email, a 12–128 character password, and confirmation before forwarding to Better Auth. Registration starts email verification and does not create organisation access.
- `/login` establishes Better Auth's opaque cookie session and accepts only local redirect paths.
- `/verify-email` handles success and invalid/expired states and can request a throttled resend.
- `/forgot-password` always shows a generic result. `/reset-password` consumes Better Auth's expiring, single-use token and revokes existing sessions after success.
- `/app/dashboard` validates the database-backed session in a server component. Logout invalidates the server session.

Better Auth owns password hashing, session/token generation, verification and reset-token consumption, cookie security, CSRF/origin validation, and database-backed endpoint rate limiting. Cookies are HTTP-only, SameSite Lax by library default, and Secure in production. Authentication tokens are never placed in local storage.

## Database

The version-controlled Drizzle migration creates only Better Auth's `user`, `session`, `account`, `verification`, and `rate_limit` tables. Authentication identifiers are library-generated UUIDs. Email and session tokens are unique; foreign keys connect sessions/accounts to users. No organisation or commerce tables exist.

## Configuration and email

Generate `BETTER_AUTH_SECRET` with a cryptographically secure generator, keep it server-only, and rotate it through controlled secret management because rotation invalidates secret-backed state. `BETTER_AUTH_URL` must be the application's canonical origin.

Local development uses `EMAIL_DELIVERY_MODE=preview`; messages containing verification/reset links are written to the ignored `.auth-emails/` directory and are not logged. Production rejects preview mode and requires `smtp` plus `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM`. SMTP delivery is provider-independent.

## Security and limitations

The library performs origin validation and first-login CSRF checks; those protections remain enabled. Database rate limits protect login, registration, verification resend, and reset requests across instances. Login errors and recovery responses avoid account enumeration. SMTP delivery is awaited for reliability, which can still expose timing differences at the transport layer; a durable email queue is deferred until background-job infrastructure exists. MFA, social login, SSO, organisations, memberships, and roles are out of scope.

Run `pnpm test` for validation/configuration tests and `pnpm test:integration` with the dedicated PostgreSQL test database. Apply migrations with `pnpm db:migrate` before starting the app.
