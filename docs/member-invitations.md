# Member invitations

PB-007 lets an authenticated, verified organisation owner invite a person to join an active organisation. The recipient may accept or decline after signing in with the exact verified email address that was invited. Owners may revoke pending invitations from `/app/organisations/[organisationId]/invitations`.

## Lifecycle and token security

Invitations move from `pending` to exactly one terminal state: `accepted`, `declined`, `revoked`, or `expired`. Database checks prevent contradictory resolution timestamps. Pending invitations expire after seven days. A partial unique index permits only one pending invitation per organisation and normalised email.

Tokens contain 256 bits from Node's cryptographically secure random source. PBcoms stores only a unique SHA-256 token hash. The raw token appears only in the recipient link and the recipient's CSRF-protected response request; it is excluded from management queries, API results, analytics, and application logs. Tokens are single-use, bounded, URL-safe, and compared through their hash.

Acceptance locks the invitation row, rechecks status, expiry, organisation status, recipient email, and membership, then inserts a `member` membership and marks the invitation accepted in one transaction. A failed insert or status update rolls back both operations. Row locking plus membership and pending-invitation uniqueness constraints protect concurrent requests.

## Transitional membership model

PB-007 expands the existing membership constraint to `owner | member`. Owners retain organisation creation, business-onboarding mutation, and invitation-management authority. Members receive membership-scoped read access and appear in the PB-006 organisation switcher, but cannot create or revoke invitations or modify PB-005 business profiles. This is the minimum compatibility change for invitations, not the PB-008 roles system or PB-009 permissions engine.

## Authentication and tenant isolation

Invitation creation requires a verified current owner of an active organisation. Acceptance and decline require an authenticated, verified user whose normalised email matches the invitation. Possessing a link alone grants no access. Revocation revalidates current owner membership and scopes the invitation ID to that organisation. All mutation endpoints enforce the configured trusted request origin.

Invalid, cross-tenant, inactive, replayed, revoked, declined, and expired invitations return safe codes without revealing registered-user information. Invitation creation checks membership by joining the invite email to an existing user only inside the authorised organisation transaction.

## Email delivery

PBcoms reuses the existing email abstraction. In development and test, `EMAIL_DELIVERY_MODE=preview` writes a private preview file to `.auth-emails`; this is the supported way to retrieve a test link without a real mailbox. Preview mode is prohibited in production. Production requires `EMAIL_DELIVERY_MODE=smtp` and the documented SMTP variables; PBcoms does not invent credentials or claim delivery when the adapter fails. A delivery failure revokes the newly created invitation.

Production deployments should additionally apply infrastructure-level rate limiting to invitation creation and token-response routes. The application provides database-backed duplicate suppression, seven-day expiry, non-enumerating responses, and Better Auth's existing rate-limit foundation, but does not introduce a distributed abuse-control service in PB-007.

## Development test procedure

1. Configure the normal local database and authentication variables with `EMAIL_DELIVERY_MODE=preview`.
2. Sign in as a verified organisation owner and create an invitation from the organisation invitation page.
3. Open the generated private preview file under `.auth-emails` and follow its link.
4. Sign in as a verified account with the invited email, then accept or decline.
5. Run `pnpm test:integration` only with a dedicated `DATABASE_TEST_URL` whose database name contains a standalone `test` marker.

## Known limitations

PB-007 does not provide invitation resend, member removal, ownership transfer, custom roles, permissions, or a distributed production rate limiter. Those remain separate future concerns. Invitation records are retained for lifecycle accountability; full audit logging is deferred.
