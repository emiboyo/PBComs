import { assertDedicatedTestDatabase } from "@pbcoms/database";
import {
  assignableOrganisationRoles,
  type OrganisationRole,
} from "@pbcoms/shared";
import { config } from "dotenv";
import { resolve } from "node:path";
import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

config({ path: resolve(process.cwd(), "../../.env"), quiet: true });
process.env.DATABASE_URL = assertDedicatedTestDatabase(process.env);
const owner = {
  id: "pb008-owner",
  email: "owner@pb008.test",
  emailVerified: true,
};
const member = {
  id: "pb008-member",
  email: "member@pb008.test",
  emailVerified: true,
};
const outsider = {
  id: "pb008-outsider",
  email: "outside@pb008.test",
  emailVerified: true,
};

describe("organisation role management", () => {
  let service: typeof import("./membership-service");
  let organisations: typeof import("./organisation-service");
  let invitations: typeof import("./invitation-service");
  let profiles: typeof import("./business-profile-service");
  let db: typeof import("./database").databaseClient;
  let schema: typeof import("@pbcoms/database").schema;
  let organisationId: string,
    otherId: string,
    ownerMembershipId: string,
    memberId: string;
  beforeAll(async () => {
    service = await import("./membership-service");
    organisations = await import("./organisation-service");
    invitations = await import("./invitation-service");
    profiles = await import("./business-profile-service");
    db = (await import("./database")).databaseClient;
    schema = (await import("@pbcoms/database")).schema;
  });
  beforeEach(async () => {
    assertDedicatedTestDatabase(process.env);
    await db.sql`truncate table organisation_invitation, organisation_business_activity, business_profile, organisation_membership, organisation, "user" cascade`;
    await db.db.insert(schema.user).values(
      [owner, member, outsider].map((actor) => ({
        ...actor,
        name: actor.id,
      })),
    );
    const first = await organisations.createOrganisation(owner, {
      name: "Role management",
    });
    const other = await organisations.createOrganisation(outsider, {
      name: "Other tenant",
    });
    if (!first.ok || !other.ok) throw new Error("fixture setup failed");
    organisationId = first.organisation.id;
    otherId = other.organisation.id;
    const [existingOwner] = await db.db
      .select()
      .from(schema.organisationMembership)
      .where(eq(schema.organisationMembership.organisationId, organisationId));
    ownerMembershipId = existingOwner!.id;
    const [created] = await db.db
      .insert(schema.organisationMembership)
      .values({ organisationId, userId: member.id, role: "member" })
      .returning();
    memberId = created!.id;
  });
  afterAll(async () => db.close());
  async function current(id = memberId) {
    const [record] = await db.db
      .select()
      .from(schema.organisationMembership)
      .where(eq(schema.organisationMembership.id, id));
    return record!;
  }
  const assign = (role: OrganisationRole) =>
    service.assignOrganisationRole(owner, organisationId, memberId, { role });

  it.each(assignableOrganisationRoles)(
    "owner assigns %s and records who and when without replacing membership",
    async (role) => {
      const before = await current();
      const result = await assign(role);
      const after = await current();
      expect(result.role).toBe(role);
      expect(after.id).toBe(before.id);
      expect(after.createdAt).toEqual(before.createdAt);
      if (role !== "member") {
        expect(after.roleChangedByUserId).toBe(owner.id);
        expect(after.roleChangedAt).toBeInstanceOf(Date);
      } else expect(after.roleChangedAt).toBeNull();
    },
  );
  it("changes non-owner roles and leaves metadata unchanged on an idempotent request", async () => {
    await assign("admin");
    await assign("viewer");
    const first = await current();
    await assign("viewer");
    expect(await current()).toEqual(first);
  });
  it.each(assignableOrganisationRoles)(
    "%s cannot assign roles, self-promote, invite, revoke, or modify onboarding",
    async (role) => {
      let token = "";
      await invitations.createOrganisationInvitation(
        owner,
        organisationId,
        { email: "pending@pb008.test" },
        {
          delivery: {
            async send(message) {
              token = message.text;
            },
          },
        },
      );
      expect(token).toContain("/app/invitations/");
      const [pending] = await invitations.getOrganisationInvitations(
        owner,
        organisationId,
      );
      await assign(role);
      await expect(
        service.assignOrganisationRole(member, organisationId, memberId, {
          role: "owner",
        }),
      ).rejects.toMatchObject({ code: "not_found" });
      await expect(
        service.assignOrganisationRole(
          member,
          organisationId,
          ownerMembershipId,
          { role: "viewer" },
        ),
      ).rejects.toMatchObject({ code: "not_found" });
      await expect(
        invitations.createOrganisationInvitation(member, organisationId, {
          email: outsider.email,
        }),
      ).rejects.toMatchObject({ code: "not_found" });
      await expect(
        invitations.revokeOrganisationInvitation(
          member,
          organisationId,
          pending!.id,
        ),
      ).rejects.toMatchObject({ code: "not_found" });
      await expect(
        profiles.saveBusinessProfileDraft(member, organisationId, {
          tradingName: "Denied",
        }),
      ).rejects.toMatchObject({ code: "not_found" });
      expect((await current(ownerMembershipId)).role).toBe("owner");
    },
  );
  it("owner and admin may read the roster and a role; other roles and outsiders cannot", async () => {
    expect(
      await service.listOrganisationMembers(owner, organisationId),
    ).toHaveLength(2);
    await assign("admin");
    expect(
      await service.getOrganisationMemberRole(member, organisationId, memberId),
    ).toBe("admin");
    for (const role of ["manager", "staff", "viewer", "member"] as const) {
      await assign(role);
      await expect(
        service.listOrganisationMembers(member, organisationId),
      ).rejects.toMatchObject({ code: "not_found" });
    }
    await expect(
      service.listOrganisationMembers(outsider, organisationId),
    ).rejects.toMatchObject({ code: "not_found" });
  });
  it("requires authenticated, verified actors", async () => {
    await expect(
      service.assignOrganisationRole(null, organisationId, memberId, {
        role: "admin",
      }),
    ).rejects.toMatchObject({ code: "unauthenticated" });
    await expect(
      service.listOrganisationMembers(null, organisationId),
    ).rejects.toMatchObject({ code: "unauthenticated" });
    await expect(
      service.assignOrganisationRole(
        { ...owner, emailVerified: false },
        organisationId,
        memberId,
        { role: "admin" },
      ),
    ).rejects.toMatchObject({ code: "email_unverified" });
    await expect(
      service.listOrganisationMembers(
        { ...owner, emailVerified: false },
        organisationId,
      ),
    ).rejects.toMatchObject({ code: "email_unverified" });
  });
  it("rejects invalid roles, extra authority claims, and malformed IDs safely", async () => {
    for (const input of [
      { role: "root" },
      { role: "admin", actorRole: "owner" },
      null,
    ])
      await expect(
        service.assignOrganisationRole(owner, organisationId, memberId, input),
      ).rejects.toMatchObject({ code: "invalid_input" });
    await expect(
      service.assignOrganisationRole(owner, "invalid", memberId, {
        role: "admin",
      }),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      service.assignOrganisationRole(owner, organisationId, "invalid", {
        role: "admin",
      }),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      service.listOrganisationMembers(owner, "invalid"),
    ).rejects.toMatchObject({ code: "not_found" });
    expect((await current()).role).toBe("member");
  });
  it("database rejects unsupported role assignments", async () => {
    await expect(
      db.sql`update organisation_membership set role = 'root' where id = ${memberId}`,
    ).rejects.toMatchObject({ code: "23514" });
  });
  it("protects the last owner and defers new ownership assignment", async () => {
    await expect(
      service.assignOrganisationRole(owner, organisationId, ownerMembershipId, {
        role: "member",
      }),
    ).rejects.toMatchObject({ code: "last_owner" });
    await expect(assign("owner")).rejects.toMatchObject({
      code: "ownership_protected",
    });
    expect((await current(ownerMembershipId)).role).toBe("owner");
    expect((await current()).role).toBe("member");
  });
  it("concurrent attempts cannot demote the final owner", async () => {
    const result = await Promise.allSettled([
      service.assignOrganisationRole(owner, organisationId, ownerMembershipId, {
        role: "admin",
      }),
      service.assignOrganisationRole(owner, organisationId, ownerMembershipId, {
        role: "viewer",
      }),
      assign("manager"),
    ]);
    expect(result.map((item) => item.status)).toEqual([
      "rejected",
      "rejected",
      "fulfilled",
    ]);
    expect((await current(ownerMembershipId)).role).toBe("owner");
    expect((await current()).role).toBe("manager");
  });
  it("also protects multiple owners from concurrent ownership changes", async () => {
    await db.db
      .update(schema.organisationMembership)
      .set({ role: "owner" })
      .where(eq(schema.organisationMembership.id, memberId));
    const results = await Promise.allSettled([
      service.assignOrganisationRole(owner, organisationId, memberId, {
        role: "viewer",
      }),
      service.assignOrganisationRole(
        member,
        organisationId,
        ownerMembershipId,
        { role: "staff" },
      ),
    ]);
    expect(results.every((result) => result.status === "rejected")).toBe(true);
    expect((await current()).role).toBe("owner");
    expect((await current(ownerMembershipId)).role).toBe("owner");
  });
  it("serialises concurrent non-owner assignments", async () => {
    const result = await Promise.all([assign("admin"), assign("staff")]);
    expect(result.map((record) => record.role).sort()).toEqual([
      "admin",
      "staff",
    ]);
    expect(["admin", "staff"]).toContain((await current()).role);
    expect((await current()).roleChangedByUserId).toBe(owner.id);
  });
  it("scopes both target and actor to the requested tenant", async () => {
    const [otherOwner] = await db.db
      .select()
      .from(schema.organisationMembership)
      .where(eq(schema.organisationMembership.organisationId, otherId));
    await expect(
      service.assignOrganisationRole(owner, organisationId, otherOwner!.id, {
        role: "viewer",
      }),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      service.assignOrganisationRole(owner, otherId, memberId, {
        role: "viewer",
      }),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      service.assignOrganisationRole(outsider, organisationId, memberId, {
        role: "admin",
      }),
    ).rejects.toMatchObject({ code: "not_found" });
  });
  it("rejects removed target memberships and removed actor authority", async () => {
    await db.db
      .delete(schema.organisationMembership)
      .where(eq(schema.organisationMembership.id, memberId));
    await expect(assign("admin")).rejects.toMatchObject({ code: "not_found" });
    await db.db
      .insert(schema.organisationMembership)
      .values({ organisationId, userId: member.id, role: "owner" });
    await db.db
      .delete(schema.organisationMembership)
      .where(eq(schema.organisationMembership.id, ownerMembershipId));
    await expect(
      service.assignOrganisationRole(owner, organisationId, memberId, {
        role: "staff",
      }),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      service.listOrganisationMembers(owner, organisationId),
    ).rejects.toMatchObject({ code: "not_found" });
  });
  it.each(["suspended", "archived"] as const)(
    "rejects mutations and rosters for %s organisations",
    async (status) => {
      await db.db
        .update(schema.organisation)
        .set({ status })
        .where(eq(schema.organisation.id, organisationId));
      await expect(assign("admin")).rejects.toMatchObject({
        code: "not_found",
      });
      await expect(
        service.listOrganisationMembers(owner, organisationId),
      ).rejects.toMatchObject({ code: "not_found" });
    },
  );
  it("reports the current role independently in each tenant", async () => {
    await assign("manager");
    await db.db
      .insert(schema.organisationMembership)
      .values({ organisationId: otherId, userId: member.id, role: "viewer" });
    const own = await organisations.createOrganisation(member, {
      name: "Member's own company",
    });
    if (!own.ok) throw new Error("fixture failed");
    const summaries = await organisations.getOrganisationsForUser(member);
    expect(summaries.find((record) => record.id === organisationId)?.role).toBe(
      "manager",
    );
    expect(summaries.find((record) => record.id === otherId)?.role).toBe(
      "viewer",
    );
    expect(
      summaries.find((record) => record.id === own.organisation.id)?.role,
    ).toBe("owner");
    await expect(assign("viewer")).resolves.toMatchObject({ role: "viewer" });
  });
  it("preserves pending member invitations, then allows post-join role assignment", async () => {
    await db.db
      .delete(schema.organisationMembership)
      .where(eq(schema.organisationMembership.id, memberId));
    let token = "";
    await invitations.createOrganisationInvitation(
      owner,
      organisationId,
      { email: member.email },
      {
        delivery: {
          async send(message) {
            token = /\/app\/invitations\/([\w-]+)/.exec(message.text)![1]!;
          },
        },
      },
    );
    await expect(
      invitations.respondToInvitation(member, { token, action: "accept" }),
    ).resolves.toMatchObject({ ok: true });
    const roster = await service.listOrganisationMembers(owner, organisationId);
    const joined = roster.find((record) => record.userId === member.id)!;
    expect(joined.role).toBe("member");
    expect(joined.roleChangedAt).toBeNull();
    await expect(
      service.assignOrganisationRole(owner, organisationId, joined.id, {
        role: "admin",
      }),
    ).resolves.toMatchObject({ role: "admin" });
  });
  it("rolls back role and trace metadata on a database failure", async () => {
    const before = await current();
    await db.sql`create function pb008_fail_role_update() returns trigger language plpgsql as $$ begin raise exception 'test rollback'; end $$`;
    await db.sql`create trigger pb008_role_update_failure after update on organisation_membership for each row execute function pb008_fail_role_update()`;
    try {
      await expect(assign("admin")).rejects.toBeTruthy();
      expect(await current()).toEqual(before);
    } finally {
      await db.sql`drop trigger pb008_role_update_failure on organisation_membership`;
      await db.sql`drop function pb008_fail_role_update()`;
    }
  });
});
