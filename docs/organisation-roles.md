# Organisation roles

PB-008 introduces stable system-defined role codes on each organisation
membership. A user's role in one organisation never grants access to another.

| Code      | Intended purpose                          | Authority implemented in PB-008                                           |
| --------- | ----------------------------------------- | ------------------------------------------------------------------------- |
| `owner`   | Organisation ownership and administration | Existing owner-only operations, roster access, and non-owner role changes |
| `admin`   | General administration without ownership  | Roster viewing and existing membership-scoped reads                       |
| `manager` | Day-to-day operational management         | Existing membership-scoped reads only                                     |
| `staff`   | Standard operational participation        | Existing membership-scoped reads only                                     |
| `viewer`  | Read-only participation                   | Existing membership-scoped reads only                                     |
| `member`  | Transitional PB-007 membership            | Existing membership-scoped reads only                                     |

Role names do not imply extra operational permissions. Invitation creation and
revocation and business onboarding mutations remain strictly owner-only.
PB-009 will introduce granular permissions separately. There are no custom roles,
global tenant roles, permission records, or new authorisation framework.

## Definitions and non-destructive migration

`@pbcoms/shared` owns canonical codes, labels, descriptions, and the small explicit
management/roster policy. Stable codes are sufficient for these fixed system
roles; separate mutable role-definition records would add unnecessary infrastructure.
PB-009 can associate permission records with these same codes later.

Migration `0004_icy_jean_grey.sql` expands the database role check, adds nullable
`role_changed_at` and `role_changed_by_user_id` metadata, and defaults future
memberships to the conservative `member` role. Existing membership IDs, roles,
creation/update timestamps, organisation ownership, and invitations are untouched.
Organisation creation continues to explicitly insert its owner. Pending and future
PB-007 invitations still grant exactly `member`; invitation-time role selection
is deferred. Owners may assign an eligible role after the recipient joins.

The metadata identifies the latest real role change and its authenticated actor.
An idempotent request does not overwrite it. Historical rows retain null metadata;
no past attribution is invented. The actor reference uses a restricted foreign key.
This is not the PB-011 audit log and does not retain a complete change history.

## Authority and ownership

Only an authenticated, verified current owner of an active organisation may
assign `admin`, `manager`, `staff`, `viewer`, or transitional `member` to an
existing non-owner membership. Owners and admins with verified email may view the
roster (including email addresses); other members cannot. This new roster privacy
policy does not expand existing organisation-summary or profile read access.

Owner assignment, owner demotion, member removal, and ownership transfer are
explicitly deferred. All existing owners are immutable through PB-008, including
when multiple owners already exist. The last owner receives a specific
`last_owner` conflict; changes to other owner memberships or assignment of
`owner` receive `ownership_protected`. There is no membership deletion endpoint.
Together with atomic owner creation, these supported application operations
preserve at least one owner per active organisation. These application invariants
do not prevent an administrator from editing the database directly; future
ownership/removal operations must extend the same transactional safeguards.

Each update locks the organisation row first, re-reads and locks the current
actor membership, then locks the target membership in that organisation. It checks
active status and owner authority inside the transaction. All PB-008 writers use
this lock order, serialising role changes within an organisation. Failed writes
roll back both the role and metadata. No cached/client role is trusted.

Unknown tenants, inaccessible tenants, missing memberships, removed actors, and
inactive organisations use the same safe `not_found` response. Target membership
IDs are always scoped to the requested organisation. Inputs are validated with
Zod; role payloads reject unknown fields and unsupported codes.

## API and interface

- `GET /api/organisations/[organisationId]/members`: owner/admin roster.
- `PATCH /api/organisations/[organisationId]/members/[membershipId]/role`:
  owner-only change with JSON `{ "role": "manager" }`.
- `/app/organisations/[organisationId]/members`: responsive roster, current role,
  membership dates, role descriptions, and owner-only role controls.

Mutations fail closed on missing, malformed, or untrusted browser origins before
authentication/body processing. Every API success/error response is `no-store`;
error bodies disclose only safe codes. Session identity is obtained server-side.
The switcher shows each organisation's own current role; switching never carries
authority from a different tenant. Existing PB-007 token headers/log protections
are unchanged.

## Verification

Run the documented root quality gates and `pnpm test:integration`. The integration
runner includes a migration test that creates a uniquely named disposable test
database, applies migrations through PB-007, seeds owner/member memberships and a
pending invitation, applies PB-008, and verifies preserved data and constraints.
It closes connections and drops that database afterward. Test credentials need
`CREATEDB` for this test only; never grant this capability to production app users.
The CI PostgreSQL service user already has it. A local Compose test role can be
prepared with:

```sh
docker compose exec -T postgres psql -U pbcoms -d pbcoms -c 'ALTER ROLE pbcoms_test CREATEDB'
```

`apps/web/scripts/role-management-smoke.mjs` checks real production API and HTML
responses, using temporary fixtures in a dedicated database whose name ends in
`_test`. Use the same production-server setup documented in
[invitation security](./invitation-security.md), then run from the root:

```sh
node --env-file=.env --test apps/web/scripts/role-management-smoke.mjs
```

The production server and runner must use the same dedicated test database and
authentication secret. Do not run destructive integration suites concurrently
with the HTTP tests. CI runs invitation and role smoke tests after building.
