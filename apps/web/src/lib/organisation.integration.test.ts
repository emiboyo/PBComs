import { config } from "dotenv";
import { resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

config({ path: resolve(process.cwd(), "../../.env"), quiet: true });
if (!process.env.DATABASE_TEST_URL)
  throw new Error(
    "DATABASE_TEST_URL is required for organisation integration tests.",
  );
process.env.DATABASE_URL = process.env.DATABASE_TEST_URL;

const owner = { id: "pb004-owner", emailVerified: true };
const other = { id: "pb004-other", emailVerified: true };
const unverified = { id: "pb004-unverified", emailVerified: false };

describe("organisation integration", () => {
  let service: typeof import("./organisation-service");
  let database: typeof import("./database");
  let schema: typeof import("@pbcoms/database").schema;

  beforeAll(async () => {
    service = await import("./organisation-service");
    database = await import("./database");
    schema = (await import("@pbcoms/database")).schema;
  });

  beforeEach(async () => {
    await database.databaseClient
      .sql`truncate table organisation_membership, organisation, "user" cascade`;
    await database.databaseClient.db.insert(schema.user).values([
      {
        id: owner.id,
        name: "Owner",
        email: "owner@pb004.test",
        emailVerified: true,
      },
      {
        id: other.id,
        name: "Other",
        email: "other@pb004.test",
        emailVerified: true,
      },
      {
        id: unverified.id,
        name: "Unverified",
        email: "unverified@pb004.test",
        emailVerified: false,
      },
    ]);
  });

  afterAll(async () => {
    await database.databaseClient.close();
  });

  it("creates an organisation and owner membership atomically", async () => {
    const result = await service.createOrganisation(owner, {
      name: "PearlBridge Trading",
    });
    expect(result.ok).toBe(true);
    const organisations = await service.getOrganisationsForUser(owner);
    expect(organisations).toMatchObject([
      {
        name: "PearlBridge Trading",
        slug: "pearlbridge-trading",
        role: "owner",
      },
    ]);
  });

  it("rejects unauthenticated and unverified creation", async () => {
    await expect(
      service.createOrganisation(null, { name: "No User" }),
    ).rejects.toMatchObject({ code: "unauthenticated" });
    await expect(
      service.createOrganisation(unverified, { name: "No Verify" }),
    ).rejects.toMatchObject({ code: "email_unverified" });
  });

  it("allows one user to create multiple organisations", async () => {
    await service.createOrganisation(owner, { name: "First Company" });
    await service.createOrganisation(owner, { name: "Second Company" });
    expect(await service.getOrganisationsForUser(owner)).toHaveLength(2);
  });

  it("returns a typed conflict for a duplicate preferred slug", async () => {
    await service.createOrganisation(owner, {
      name: "First",
      slug: "shared-slug",
    });
    await expect(
      service.createOrganisation(other, {
        name: "Second",
        slug: "shared-slug",
      }),
    ).resolves.toEqual({ ok: false, code: "slug_taken" });
  });

  it("resolves concurrent generated slug collisions through the unique constraint", async () => {
    const results = await Promise.all([
      service.createOrganisation(owner, { name: "Concurrent Company" }),
      service.createOrganisation(other, { name: "Concurrent Company" }),
    ]);
    expect(results.every((result) => result.ok)).toBe(true);
    const slugs = results.flatMap((result) =>
      result.ok ? [result.organisation.slug] : [],
    );
    expect(new Set(slugs)).toEqual(
      new Set(["concurrent-company", "concurrent-company-2"]),
    );
  });

  it("scopes listing and details to membership and denies cross-tenant access", async () => {
    const result = await service.createOrganisation(owner, {
      name: "Private Company",
    });
    if (!result.ok) throw new Error("Expected creation to succeed");
    expect(await service.getOrganisationsForUser(other)).toEqual([]);
    await expect(
      service.requireOrganisationMembership(other, result.organisation.id),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      service.requireOrganisationOwner(owner, result.organisation.id),
    ).resolves.toMatchObject({ role: "owner" });
  });

  it("enforces membership uniqueness and rolls back failed transactions", async () => {
    const result = await service.createOrganisation(owner, {
      name: "Constraint Company",
    });
    if (!result.ok) throw new Error("Expected creation to succeed");
    await expect(
      database.databaseClient.db.insert(schema.organisationMembership).values({
        organisationId: result.organisation.id,
        userId: owner.id,
        role: "owner",
      }),
    ).rejects.toMatchObject({ cause: { code: "23505" } });
    await expect(
      database.databaseClient.db.transaction(async (tx) => {
        await tx.insert(schema.organisation).values({
          name: "Rollback Company",
          slug: "rollback-company",
          createdByUserId: owner.id,
        });
        throw new Error("force rollback");
      }),
    ).rejects.toThrow("force rollback");
    expect(
      await database.databaseClient.db
        .select()
        .from(schema.organisation)
        .where(
          (await import("drizzle-orm")).eq(
            schema.organisation.slug,
            "rollback-company",
          ),
        ),
    ).toEqual([]);
  });
});
