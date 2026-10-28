# Invitation URL security

Invitation URLs contain single-use bearer tokens. The database stores only
SHA-256 hashes; management responses select public invitation fields explicitly.
The response endpoint returns fixed result codes and never echoes the token.
Owner checks, trusted-origin validation, verified recipient matching, row locks,
expiry/state checks, and atomic membership creation remain in place.

Next.js route-specific `headers()` applies `Referrer-Policy: no-referrer` and
`Cache-Control: private, no-store, max-age=0` to `/app/invitations/:path*` and
`/login`. Login needs the same protection because its `next` query can contain
an invitation URL. Both pages explicitly use dynamic rendering. Next.js may
strengthen the cache policy to
`private, no-cache, no-store, max-age=0, must-revalidate` for a rendered response;
the HTTP smoke test checks the effective response, including Flight redirects.
Referrer metadata also updates the document policy on client navigation; the
HTTP header is the primary protection on document responses.

`/api/invitations/respond` receives `Cache-Control: no-store` from route
configuration, and every handled JSON response sets it explicitly, including
origin, authentication, input, state, and unexpected-service errors. The client
also sets `referrerPolicy: no-referrer` and `cache: no-store` for its POST.
Successful login and invitation acceptance replace the current history entry.
This reduces token-bearing history entries; it does not erase previously visited
URLs from browser history, bookmarks, copied links, or email.

The invitation page and shared layout load no external scripts, images, analytics,
or fonts. There is no application analytics or URL logging. Next.js development
incoming-request logging excludes invitation URLs and login requests (including
encoded return URLs). Next.js build telemetry does not receive invitation URLs.
Keep hosting/CDN/access-log and external observability configuration from recording
these URLs or their query strings; application headers cannot redact upstream
logs. Never include real tokens, cookies, email previews, or invitation URLs in
reports or diagnostic output.

## Production HTTP regression check

CI runs `apps/web/scripts/invitation-security-smoke.mjs` after the production
build. It verifies real response headers for signed-out HTML/Flight redirects,
the login destination, authenticated invitation HTML, successful acceptance and
decline, replay rejection, and origin/authentication/JSON errors. It also checks
that API bodies do not echo submitted tokens. Integration tests separately cover
hash-only storage, management response redaction, expiration, revocation,
recipient checks, concurrent acceptance, rollback, and tenant isolation.

For local reproduction, stop any development server using port 3000. First apply
the existing migrations to the dedicated disposable `DATABASE_TEST_URL`. From
the repository root, with Node 24 and the ignored root `.env` configured:

```sh
corepack pnpm db:migrations:check
node --env-file=.env -e 'const r=require("node:child_process").spawnSync("corepack",["pnpm","db:migrate"],{stdio:"inherit",env:{...process.env,DATABASE_URL:process.env.DATABASE_TEST_URL}});process.exit(r.status??1)'
EMAIL_DELIVERY_MODE=smtp corepack pnpm build
node --env-file=.env -e 'const r=require("node:child_process").spawnSync("corepack",["pnpm","--filter","@pbcoms/web","start"],{stdio:"inherit",env:{...process.env,NODE_ENV:"production",DATABASE_URL:process.env.DATABASE_TEST_URL,EMAIL_DELIVERY_MODE:"smtp"}});process.exit(r.status??1)'
```

The build and server require valid SMTP configuration fields, but these tests do
not send mail. In another terminal, from the repository root:

```sh
node --env-file=.env --test apps/web/scripts/invitation-security-smoke.mjs
```

The smoke test requires a database name ending in `_test`. The server must use
that same database and authentication secret. It creates random, temporary
verified-user/session/organisation/invitation fixtures and deletes them afterward.
The signed session cookie exists only in memory and is never printed. Do not run
other integration suites concurrently against this database, since those suites
truncate tables. Stop the test server after verification.
