import { assertDedicatedTestDatabase } from "@pbcoms/database";
import { config } from "dotenv";
import { resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

config({ path: resolve(process.cwd(), "../../.env"), quiet: true });
process.env.DATABASE_URL = assertDedicatedTestDatabase(process.env);

const owner = {
  id: "pb007-owner",
  email: "owner@pb007.test",
  emailVerified: true,
};
const recipient = {
  id: "pb007-recipient",
  email: "recipient@pb007.test",
  emailVerified: true,
};
const wrongRecipient = {
  id: "pb007-wrong",
  email: "wrong@pb007.test",
  emailVerified: true,
};
const unverified = {
  id: "pb007-unverified",
  email: "unverified@pb007.test",
  emailVerified: false,
};

describe("member invitation integration", () => {
  let invitations: typeof import("./invitation-service");
  let organisations: typeof import("./organisation-service");
  let profiles: typeof import("./business-profile-service");
  let database: typeof import("./database");
  let schema: typeof import("@pbcoms/database").schema;
  let organisationId: string;
  let otherOrganisationId: string;

  beforeAll(async () => {
    invitations = await import("./invitation-service");
    organisations = await import("./organisation-service");
    profiles = await import("./business-profile-service");
    database = await import("./database");
    schema = (await import("@pbcoms/database")).schema;
  });

  beforeEach(async () => {
    assertDedicatedTestDatabase(process.env);
    await database.databaseClient
      .sql`truncate table organisation_invitation, organisation_business_activity, business_profile, organisation_membership, organisation, "user" cascade`;
    await database.databaseClient.db.insert(schema.user).values([
      { ...owner, name: "Owner" },
      { ...recipient, name: "Recipient" },
      { ...wrongRecipient, name: "Wrong" },
      { ...unverified, name: "Unverified" },
    ]);
    const created = await organisations.createOrganisation(owner, {
      name: "Invitation Company",
    });
    const other = await organisations.createOrganisation(wrongRecipient, {
      name: "Other Company",
    });
    if (!created.ok || !other.ok) throw new Error("setup failed");
    organisationId = created.organisation.id;
    otherOrganisationId = other.organisation.id;
  });

  afterAll(async () => database.databaseClient.close());

  async function invite(
    email = recipient.email,
    options: { actor?: typeof owner; now?: Date } = {},
  ) {
    let token = "";
    const result = await invitations.createOrganisationInvitation(
      options.actor ?? owner,
      organisationId,
      { email },
      {
        now: options.now,
        applicationUrl: "https://app.pbcoms.test",
        delivery: {
          async send(message) {
            token =
              /\/app\/invitations\/([A-Za-z0-9_-]+)/.exec(message.text)?.[1] ??
              "";
          },
        },
      },
    );
    expect(result).toEqual({ ok: true });
    expect(token).toHaveLength(43);
    return token;
  }

  it("lets an owner create a hashed, seven-day member invitation", async () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const token = await invite(" Recipient@PB007.TEST ", { now });
    const [stored] = await database.databaseClient.db
      .select()
      .from(schema.organisationInvitation);
    expect(stored).toMatchObject({
      organisationId,
      email: recipient.email,
      role: "member",
      status: "pending",
    });
    expect(stored?.tokenHash).not.toBe(token);
    expect(stored?.expiresAt).toEqual(
      new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    );
    const management = await invitations.getOrganisationInvitations(
      owner,
      organisationId,
    );
    expect(management).toHaveLength(1);
    expect(JSON.stringify(management)).not.toContain(token);
    expect(JSON.stringify(management)).not.toContain(stored?.tokenHash);
    expect(management[0]).not.toHaveProperty("token");
    expect(management[0]).not.toHaveProperty("tokenHash");
  });

  it("rejects unauthenticated, unverified, and non-owner invitation creation", async () => {
    await expect(
      invitations.createOrganisationInvitation(null, organisationId, {
        email: recipient.email,
      }),
    ).rejects.toMatchObject({ code: "unauthenticated" });
    await expect(
      invitations.createOrganisationInvitation(
        { ...owner, emailVerified: false },
        organisationId,
        {
          email: recipient.email,
        },
      ),
    ).rejects.toMatchObject({ code: "email_unverified" });
    await database.databaseClient.db
      .insert(schema.organisationMembership)
      .values({ organisationId, userId: wrongRecipient.id, role: "member" });
    await expect(
      invitations.createOrganisationInvitation(wrongRecipient, organisationId, {
        email: recipient.email,
      }),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("rejects existing members and concurrent duplicate pending invitations", async () => {
    await database.databaseClient.db
      .insert(schema.organisationMembership)
      .values({ organisationId, userId: recipient.id, role: "member" });
    await expect(
      invitations.createOrganisationInvitation(owner, organisationId, {
        email: recipient.email,
      }),
    ).resolves.toMatchObject({ ok: false, code: "already_member" });
    await database.databaseClient.db
      .delete(schema.organisationMembership)
      .where(
        (await import("drizzle-orm")).eq(
          schema.organisationMembership.userId,
          recipient.id,
        ),
      );
    await invite();
    await expect(
      invitations.createOrganisationInvitation(owner, organisationId, {
        email: recipient.email,
      }),
    ).resolves.toMatchObject({ ok: false, code: "duplicate_pending" });
  });

  it("accepts once atomically and exposes a member in the switcher", async () => {
    const token = await invite();
    await expect(
      invitations.respondToInvitation(recipient, { token, action: "accept" }),
    ).resolves.toMatchObject({ ok: true, organisationId });
    expect(
      await organisations.getOrganisationsForUser(recipient),
    ).toMatchObject([{ id: organisationId, role: "member" }]);
    await expect(
      invitations.respondToInvitation(recipient, { token, action: "accept" }),
    ).resolves.toMatchObject({ ok: false, code: "not_pending" });
    const memberships = await database.databaseClient.db
      .select()
      .from(schema.organisationMembership);
    expect(
      memberships.filter((membership) => membership.userId === recipient.id),
    ).toHaveLength(1);
  });

  it("rejects wrong and unverified recipients", async () => {
    const token = await invite();
    await expect(
      invitations.respondToInvitation(wrongRecipient, {
        token,
        action: "accept",
      }),
    ).resolves.toMatchObject({ ok: false, code: "email_mismatch" });
    await expect(
      invitations.respondToInvitation(unverified, { token, action: "accept" }),
    ).rejects.toMatchObject({ code: "email_unverified" });
  });

  it("rejects unauthenticated and unknown tokens without echoing them", async () => {
    const token = "x".repeat(43);
    await expect(
      invitations.respondToInvitation(null, { token, action: "accept" }),
    ).rejects.toMatchObject({ code: "unauthenticated" });
    const result = await invitations.respondToInvitation(recipient, {
      token,
      action: "accept",
    });
    expect(result).toEqual({ ok: false, code: "not_found" });
    expect(JSON.stringify(result)).not.toContain(token);
  });

  it("prevents acceptance after expiration, decline, or revocation", async () => {
    const start = new Date("2026-01-01T00:00:00Z");
    const expired = await invite(recipient.email, { now: start });
    await expect(
      invitations.respondToInvitation(
        recipient,
        { token: expired, action: "accept" },
        new Date("2026-01-09T00:00:00Z"),
      ),
    ).resolves.toMatchObject({ ok: false, code: "expired" });

    const declined = await invite();
    await invitations.respondToInvitation(recipient, {
      token: declined,
      action: "decline",
    });
    await expect(
      invitations.respondToInvitation(recipient, {
        token: declined,
        action: "accept",
      }),
    ).resolves.toMatchObject({ ok: false, code: "not_pending" });

    const revoked = await invite();
    const pending = (
      await invitations.getOrganisationInvitations(owner, organisationId)
    ).find((item) => item.status === "pending");
    expect(pending).toBeTruthy();
    await invitations.revokeOrganisationInvitation(
      owner,
      organisationId,
      pending!.id,
    );
    await expect(
      invitations.respondToInvitation(recipient, {
        token: revoked,
        action: "accept",
      }),
    ).resolves.toMatchObject({ ok: false, code: "not_pending" });
  });

  it("serialises concurrent acceptance and creates one membership", async () => {
    const token = await invite();
    const results = await Promise.all([
      invitations.respondToInvitation(recipient, { token, action: "accept" }),
      invitations.respondToInvitation(recipient, { token, action: "accept" }),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toHaveLength(1);
  });

  it("denies cross-tenant management and keeps members out of owner mutations", async () => {
    const token = await invite();
    await invitations.respondToInvitation(recipient, {
      token,
      action: "accept",
    });
    await expect(
      invitations.getOrganisationInvitations(wrongRecipient, organisationId),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      invitations.getOrganisationInvitations(owner, otherOrganisationId),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      profiles.saveBusinessProfileDraft(recipient, organisationId, {
        tradingName: "Unauthorised change",
      }),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      profiles.saveBusinessProfileDraft(owner, organisationId, {
        tradingName: "Owner change",
      }),
    ).resolves.toMatchObject({ ok: true });
  });

  it("rolls back membership creation when acceptance cannot complete", async () => {
    const token = await invite();
    const ghost = {
      id: "missing-user",
      email: recipient.email,
      emailVerified: true,
    };
    await expect(
      invitations.respondToInvitation(ghost, { token, action: "accept" }),
    ).rejects.toBeTruthy();
    const [stored] = await database.databaseClient.db
      .select()
      .from(schema.organisationInvitation);
    expect(stored?.status).toBe("pending");
  });
});
