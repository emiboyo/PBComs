# PBcoms database

This framework-independent package owns PBcoms PostgreSQL access, Drizzle configuration, migrations, environment validation, and health checks. Importing it does not connect to PostgreSQL. Call `createDatabaseClient()`, reuse the returned pool for the process lifetime, and call `close()` during graceful shutdown or test cleanup.

## Local PostgreSQL

Docker Desktop or another Docker Engine with Compose is required. From the repository root:

```bash
Copy-Item .env.example .env # PowerShell
docker compose up -d
pnpm db:check
docker compose down
```

On Unix-like systems use `cp .env.example .env`. The named volume persists after `docker compose down`; only an explicit `docker compose down --volumes` deletes it. The container creates `pbcoms` for development and `pbcoms_test` with a separate, test-only role for integration tests. If initialization variables change after the volume exists, recreate the volume deliberately or update PostgreSQL manually.

## Environment

`DATABASE_URL` is required by the client and migration commands. It must be server-only and must never use a `NEXT_PUBLIC_` prefix. `DATABASE_TEST_URL` is read only by integration tests. The checked-in values are local placeholders; use secret management and distinct least-privilege roles for hosted environments.

## Migrations

The Drizzle schema is `src/schema/index.ts`, and generated SQL belongs in `migrations/`. PB-002 intentionally defines no tables, so generation should report that there are no schema changes.

```bash
pnpm db:generate
pnpm db:migrations:check
pnpm db:migrate
pnpm db:studio
```

In development, generate and review SQL before applying it locally. In production, deploy reviewed migrations and run `db:migrate` as a controlled release step with a migration-specific role. Never use schema push or run destructive migrations at application startup.

## Tests

`pnpm test` runs unit tests without PostgreSQL. With Docker running, `pnpm test:integration` reads `DATABASE_TEST_URL` from the root `.env`. CI provisions an isolated PostgreSQL service automatically. Integration tests use only the dedicated test database and currently execute `SELECT 1`, leaving no data behind.

## Conventions

- Use UUID primary keys by default.
- Map TypeScript `camelCase` properties to PostgreSQL `snake_case` names.
- Use timezone-aware timestamps with database defaults for `created_at`; update `updated_at` deliberately.
- Store money in integer minor units or carefully specified decimal columns, never floating point.
- Add explicit foreign keys and unique constraints. Add indexes only for demonstrated query patterns.
- Choose archival or soft deletion per domain. Do not apply universal cascading deletion.

## Multi-tenant boundary

Future business-owned rows must reference an organisation, and constraints should preserve tenant integrity. Server-side code must obtain an authorised organisation from trusted authentication context and include it in every tenant query; browser-provided organisation identifiers are never sufficient authorisation.

Application-level scoping is easier to introduce and inspect but depends on every query being correct. PostgreSQL Row-Level Security adds defence in depth but increases connection-context, migration, testing, and operational complexity. PBcoms will begin with explicit server-side scoping and evaluate RLS when organisation and membership models exist. PB-002 creates neither those tables nor RLS policies.

## Troubleshooting

- A missing URL produces `DATABASE_URL is required.` without exposing credentials.
- Check container health with `docker compose ps` and logs with `docker compose logs postgres`.
- Port conflicts can be resolved by setting `POSTGRES_PORT`, then updating both URLs.
- The health check returns a fixed failure message and never returns driver errors or connection strings.
