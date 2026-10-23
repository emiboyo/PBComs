# PBcoms

**Commerce, connected.**

PBcoms by PearlBridge is a multi-tenant commerce platform in development. This repository currently contains infrastructure only.

## Prerequisites

- Node.js 24 LTS
- pnpm 10.12.1 (Corepack can provide it with `corepack enable`)
- Docker with Compose for PostgreSQL development and integration tests

## Setup

```bash
pnpm install
cp .env.example apps/web/.env.local
cp .env.example .env
docker compose up -d
pnpm dev
```

On PowerShell, use `Copy-Item` instead of `cp`. The root `.env` supplies server-only database tooling; the web `.env.local` supplies the web app. `NODE_ENV` and `NEXT_PUBLIC_APP_NAME` retain development defaults. Open http://localhost:3000. `pnpm dev` also starts the placeholder worker.

## Database

The local Compose service provides persistent development PostgreSQL plus a separate test database. See [packages/database/README.md](packages/database/README.md) for connection management, migrations, security, tenancy conventions, testing, and troubleshooting.

```bash
docker compose up -d
pnpm db:check
pnpm db:generate
pnpm db:migrations:check
pnpm db:migrate
docker compose down
```

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
pnpm build
```

Run `pnpm format` to apply Prettier formatting. Run `pnpm --filter @pbcoms/worker start` after building to start the compiled worker.

## Workspaces

`apps/web` is the Next.js App Router application. `apps/worker` is a background-process placeholder. `packages/ui` contains reusable UI primitives, `packages/shared` contains framework-independent utilities, `packages/database` owns server-side PostgreSQL infrastructure, and `packages/config` holds shared TypeScript settings. Apps may import packages; packages must not import apps.

See [docs/README.md](docs/README.md) for the current architecture boundary.
