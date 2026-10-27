# Business onboarding (PB-005)

Each organisation owns at most one private `business_profile`. No row means `not_started`; a saved row is `in_progress` until the owner explicitly completes it. Completion records `completed_at`, which later edits preserve. Completion is profile readiness only and never legal verification or permission for regulated activity.

Activities use a controlled `business_activity_type` catalogue and the composite-key `organisation_business_activity` join table. This supports multiple simultaneous roles and future catalogue additions through migrations without creating extra organisations.

Owners can save partial drafts through the four-step onboarding route. Omitted fields and activity selections retain their saved values; an explicitly empty optional field clears that field. Final completion requires a trading name, structure, countries from the controlled ISO 3166-1 alpha-2 catalogue, description, email, operating address, and at least one unique activity. Legal name, registration number, telephone, website, second address line, region, and postal code remain optional for international compatibility.

All reads first require organisation membership; all mutations require the authenticated, email-verified owner. The server derives identity from the Better Auth session, scopes queries by organisation, checks request origin for mutations, accepts only Zod-allowlisted fields, and updates the profile and any explicitly supplied activity replacement transactionally. Profiles have no public endpoint.

Migration `0002_fair_menace.sql` creates the profile, catalogue, and join tables and seeds the initial controlled activities. Existing organisations need no repair and enter onboarding as `not_started`.

Run `pnpm db:migrate`, `pnpm test`, and `pnpm test:integration` against the dedicated test database. Future tickets may add replaceable role checks, reverification for material edits, storefront use, and commerce features; PB-005 intentionally adds no verification workflow or organisation switcher.
