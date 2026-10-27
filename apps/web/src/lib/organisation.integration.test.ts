import { config } from "dotenv";
import { resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assertDedicatedTestDatabase } from "@pbcoms/database";

config({ path: resolve(process.cwd(), "../../.env"), quiet: true });
const testDatabaseUrl = assertDedicatedTestDatabase(process.env);
process.env.DATABASE_URL = testDatabaseUrl;

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
    assertDedicatedTestDatabase(process.env);
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

  it("orders memberships consistently and includes optional trading names", async () => {
    const second = await service.createOrganisation(owner, {
      name: "Zulu Registered",
    });
    const first = await service.createOrganisation(owner, {
      name: "Alpha Registered",
    });
    if (!first.ok || !second.ok)
      throw new Error("Expected creation to succeed");
    await database.databaseClient.db.insert(schema.businessProfile).values({
      organisationId: second.organisation.id,
      tradingName: "Zulu Trading",
    });
    expect(await service.getOrganisationsForUser(owner)).toMatchObject([
      { name: "Alpha Registered", tradingName: null, status: "active" },
      {
        name: "Zulu Registered",
        tradingName: "Zulu Trading",
        status: "active",
      },
    ]);
  });

  it("shows but does not activate suspended and archived memberships", async () => {
    const active = await service.createOrganisation(owner, { name: "Active" });
    const archived = await service.createOrganisation(owner, {
      name: "Archived",
    });
    const suspended = await service.createOrganisation(owner, {
      name: "Suspended",
    });
    if (!active.ok || !archived.ok || !suspended.ok)
      throw new Error("Expected creation to succeed");
    const { eq } = await import("drizzle-orm");
    await database.databaseClient.db
      .update(schema.organisation)
      .set({ status: "archived" })
      .where(eq(schema.organisation.id, archived.organisation.id));
    await database.databaseClient.db
      .update(schema.organisation)
      .set({ status: "suspended" })
      .where(eq(schema.organisation.id, suspended.organisation.id));
    expect(
      (await service.getOrganisationsForUser(owner)).map((item) => item.status),
    ).toEqual(["active", "archived", "suspended"]);
    await expect(
      service.requireOrganisationMembership(owner, archived.organisation.id),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      service.requireOrganisationMembership(owner, suspended.organisation.id),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("removes stale access immediately when membership is removed", async () => {
    const result = await service.createOrganisation(owner, {
      name: "Removed Membership",
    });
    if (!result.ok) throw new Error("Expected creation to succeed");
    const { and, eq } = await import("drizzle-orm");
    await database.databaseClient.db
      .delete(schema.organisationMembership)
      .where(
        and(
          eq(
            schema.organisationMembership.organisationId,
            result.organisation.id,
          ),
          eq(schema.organisationMembership.userId, owner.id),
        ),
      );
    expect(await service.getOrganisationsForUser(owner)).toEqual([]);
    await expect(
      service.requireOrganisationMembership(owner, result.organisation.id),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("rejects unauthenticated listing and invalid organisation IDs", async () => {
    await expect(service.getOrganisationsForUser(null)).rejects.toMatchObject({
      code: "unauthenticated",
    });
    await expect(
      service.requireOrganisationMembership(owner, "not-a-uuid"),
    ).rejects.toMatchObject({ code: "not_found" });
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
