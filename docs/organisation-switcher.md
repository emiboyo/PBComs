# Organisation switcher

PB-006 adds a reusable organisation switcher to the dashboard, organisation detail, and business-onboarding routes. It shows only organisations for which the authenticated user has a current membership, uses the business trading name when available, and always retains the registered name as supporting context.

## Active organisation resolution

The active organisation is the UUID in `/app/organisations/[organisationId]` (and its nested onboarding route). PBcoms does not persist this value in a cookie, session, or browser storage. The route value identifies a requested context only: every organisation-scoped server render and service operation validates current membership before reading tenant data. Invalid UUIDs, deleted organisations, removed memberships, and inaccessible selections return the same not-found response and disclose no organisation details.

The dashboard has no active organisation. First-time users receive an empty switcher with a create-organisation link. A user with one or several organisations can follow the same server-rendered links to establish a URL context. Switching requires no new authentication session and never changes membership.

## Status policy

Active memberships are selectable. Suspended and archived organisations remain visible to their members with an explicit unavailable status, but cannot become active and their scoped routes fail closed. This conservative policy prevents access to tenant data while an organisation is not active without erasing the membership relationship.

## Tenant isolation

Organisation lists join from `organisation_membership` and filter by the authenticated user ID. Detail and business-profile services independently call the existing membership guard. The switcher is navigation only and is never an authorisation source. Server rendering means content from one organisation is not retained as the user navigates to another context.

No public listing or state-changing switch endpoint was added, so no new CSRF surface exists. PB-004 owner-only mutations and PB-005 transactional profile updates retain their existing controls.

## Routes and services

- `/app/dashboard` lists memberships and offers the switcher without an active selection.
- `/app/organisations/[organisationId]` displays and marks the validated active organisation.
- `/app/organisations/[organisationId]/onboarding` keeps the active organisation visible while editing its profile.
- `getOrganisationsForUser` returns membership-filtered summaries in status, name, and ID order.
- `requireOrganisationMembership` validates UUID, membership, and active status for scoped access.

## Test coverage

Unit and rendering tests cover active selection, invalid and inactive selection, empty state, current-item semantics, unavailable statuses, accessible labels, and long-name truncation. PostgreSQL integration tests cover multiple organisations, separate users, membership filtering and removal, status rules, invalid IDs, cross-tenant denial, trading names, and switching between distinct business profiles.

## Known limitations

PB-006 uses the existing PB-004 membership model, which currently supports only the `owner` role. Invitations, additional roles, permissions, persisted preferences, and a full authenticated app shell are intentionally deferred. No database migration is required for the switcher.
