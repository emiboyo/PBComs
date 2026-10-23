# Organisations

PBcoms models platform users and business organisations separately. A user can belong to many organisations, and an organisation can gain many members later. Better Auth owns identity and sessions; PBcoms owns the organisation domain.

## Data model

`organisation` has a UUID, unique lowercase slug, active/suspended/archived status, timezone-aware timestamps, and a restricted creator foreign key. `organisation_membership` joins users and organisations and uniquely constrains `(organisation_id, user_id)`. PB-004 allows only the `owner` role.

User and organisation deletion are restricted by foreign keys so authentication cleanup cannot silently destroy a business or future commercial records. PB-008 Roles and PB-009 Permissions can migrate `owner` into expanded role/permission records while preserving membership IDs.

## Creation, access, and slugs

`POST /api/organisations` derives the user from the Better Auth server session and requires verified email. Zod validates input. Generated slugs use lowercase ASCII letters, numbers, and hyphens; platform names such as `admin`, `api`, `app`, and `auth` are reserved. Organisation and owner membership are inserted in one transaction. PostgreSQL uniqueness is authoritative; generated collisions retry with numeric suffixes.

The creation API also requires a valid browser `Origin` matching the canonical `BETTER_AUTH_URL`. Missing, opaque, malformed, or cross-origin values fail closed before session or request-body processing.

Repository functions contain parameterised Drizzle queries. Services enforce actor, validation, membership, and owner rules. Protected reads join through membership, giving unknown and inaccessible IDs the same not-found result.

- `/app/dashboard` lists only the current user's organisations in stable order.
- `/app/organisations/new` creates an organisation.
- `/app/organisations/[organisationId]` requires server-side membership.

Application-level membership scoping is the current tenant boundary. Future modules must reuse it and scope every tenant query. PostgreSQL row-level security may add defense in depth later.

Run `pnpm db:generate`, `pnpm db:migrations:check`, and `pnpm db:migrate` for migrations. `pnpm test:integration` requires a dedicated PostgreSQL `DATABASE_TEST_URL` whose database name contains a standalone `test` marker. Destructive tests reject production execution and known development or production URL matches before mutation. Onboarding, organisation switching, invitations, expanded roles, and permissions remain deferred.
