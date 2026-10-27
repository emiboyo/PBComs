import { config } from "dotenv";
import { resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assertDedicatedTestDatabase } from "@pbcoms/database";

config({ path: resolve(process.cwd(), "../../.env"), quiet: true });
process.env.DATABASE_URL = assertDedicatedTestDatabase(process.env);
const owner = { id: "pb005-owner", emailVerified: true };
const other = { id: "pb005-other", emailVerified: true };
const unverified = { id: "pb005-unverified", emailVerified: false };
const complete = {
  tradingName: "PearlBridge",
  businessStructure: "company" as const,
  registrationCountry: "NG",
  description: "International commerce business",
  businessEmail: "hello@example.ng",
  operatingCountry: "NG",
  addressLine1: "12 Marina",
  city: "Lagos",
  activities: ["retail", "wholesale"] as ("retail" | "wholesale")[],
};

describe("business profile integration", () => {
  let profile: typeof import("./business-profile-service");
  let organisation: typeof import("./organisation-service");
  let database: typeof import("./database");
  let schema: typeof import("@pbcoms/database").schema;
  let organisationId: string;
  beforeAll(async () => {
    profile = await import("./business-profile-service");
    organisation = await import("./organisation-service");
    database = await import("./database");
    schema = (await import("@pbcoms/database")).schema;
  });
  beforeEach(async () => {
    assertDedicatedTestDatabase(process.env);
    await database.databaseClient
      .sql`truncate table organisation_business_activity, business_profile, organisation_membership, organisation, "user" cascade`;
    await database.databaseClient.db.insert(schema.user).values([
      {
        id: owner.id,
        name: "Owner",
        email: "owner@pb005.test",
        emailVerified: true,
      },
      {
        id: other.id,
        name: "Other",
        email: "other@pb005.test",
        emailVerified: true,
      },
      {
        id: unverified.id,
        name: "Unverified",
        email: "unverified@pb005.test",
        emailVerified: false,
      },
    ]);
    const created = await organisation.createOrganisation(owner, {
      name: "PearlBridge Trading",
    });
    if (!created.ok) throw new Error("setup failed");
    organisationId = created.organisation.id;
  });
  afterAll(async () => database.databaseClient.close());

  it("starts empty, saves a draft, and resumes it", async () => {
    expect(
      (await profile.getBusinessProfile(owner, organisationId)).status,
    ).toBe("not_started");
    expect(
      (
        await profile.saveBusinessProfileDraft(owner, organisationId, {
          tradingName: "Draft",
          currentStep: 2,
        })
      ).ok,
    ).toBe(true);
    const resumed = await profile.getBusinessProfile(owner, organisationId);
    expect(resumed.status).toBe("in_progress");
    expect(resumed.profile?.tradingName).toBe("Draft");
    expect(resumed.profile?.currentStep).toBe("2");
  });
  it("completes multiple activities and preserves completion history", async () => {
    expect(
      (
        await profile.completeBusinessOnboarding(
          owner,
          organisationId,
          complete,
        )
      ).ok,
    ).toBe(true);
    const first = await profile.getBusinessProfile(owner, organisationId);
    expect(first.activities.map((item) => item.code)).toEqual([
      "retail",
      "wholesale",
    ]);
    expect(first.profile?.completedAt).toBeTruthy();
    await profile.completeBusinessOnboarding(owner, organisationId, {
      ...complete,
      tradingName: "Updated",
      activities: ["logistics"],
    });
    const updated = await profile.getBusinessProfile(owner, organisationId);
    expect(updated.profile?.completedAt).toEqual(first.profile?.completedAt);
    expect(updated.activities.map((item) => item.code)).toEqual(["logistics"]);
  });
  it("enforces final fields, verification, and tenant isolation", async () => {
    expect(
      (
        await profile.completeBusinessOnboarding(owner, organisationId, {
          tradingName: "x",
        })
      ).ok,
    ).toBe(false);
    await expect(
      profile.saveBusinessProfileDraft(other, organisationId, {
        tradingName: "Attack",
      }),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      profile.getBusinessProfile(other, organisationId),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      profile.saveBusinessProfileDraft(unverified, organisationId, {
        tradingName: "No",
      }),
    ).rejects.toMatchObject({ code: "email_unverified" });
    await expect(
      profile.saveBusinessProfileDraft(null, organisationId, {
        tradingName: "No",
      }),
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });
  it("rolls back a failed multi-table transaction", async () => {
    await expect(
      database.databaseClient.db.transaction(async (tx) => {
        await tx
          .insert(schema.businessProfile)
          .values({ organisationId, tradingName: "Rollback" });
        await tx
          .insert(schema.organisationBusinessActivity)
          .values({ organisationId, activityCode: "missing" });
      }),
    ).rejects.toBeTruthy();
    expect(
      (await profile.getBusinessProfile(owner, organisationId)).profile,
    ).toBeNull();
  });
});
