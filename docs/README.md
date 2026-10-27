# PBcoms architecture

PB-001 established one pnpm and Turborepo monorepo. The web app may consume foundational packages; the worker is a standalone placeholder. Packages may depend on other packages but never on applications.

PB-002 adds the framework-independent PostgreSQL and Drizzle foundation in `packages/database`. The package creates connections only through an explicit factory, owns migration tooling, and exposes a safe health check. Its permanent schema remains empty. No business modules, authentication, organisation model, or queue are present.

Future tenant-owned data must be scoped using server-verified organisation context and reinforced with database constraints. See the database package documentation for detailed conventions and the future Row-Level Security trade-off.

See [authentication](./authentication.md), [organisations](./organisations.md), [business onboarding](./business-onboarding.md), and the [organisation switcher](./organisation-switcher.md) for the current application foundations.
