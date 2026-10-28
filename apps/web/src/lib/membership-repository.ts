import { schema } from "@pbcoms/database";
import {
  canManageOrganisationRoles,
  type OrganisationRole,
} from "@pbcoms/shared";
import { and, asc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { databaseClient } from "./database";
import { RoleManagementError } from "./role-management-policy";

const memberSelection = {
  id: schema.organisationMembership.id,
  userId: schema.user.id,
  name: schema.user.name,
  email: schema.user.email,
  role: schema.organisationMembership.role,
  createdAt: schema.organisationMembership.createdAt,
  roleChangedAt: schema.organisationMembership.roleChangedAt,
  roleChangedByUserId: schema.organisationMembership.roleChangedByUserId,
};

export async function selectOrganisationRoster(
  userId: string,
  organisationId: string,
) {
  const actorMembership = alias(
    schema.organisationMembership,
    "actor_membership",
  );
  const members = await databaseClient.db
    .select(memberSelection)
    .from(schema.organisationMembership)
    .innerJoin(
      schema.user,
      eq(schema.user.id, schema.organisationMembership.userId),
    )
    .innerJoin(
      schema.organisation,
      eq(schema.organisation.id, schema.organisationMembership.organisationId),
    )
    .innerJoin(
      actorMembership,
      and(
        eq(actorMembership.organisationId, schema.organisation.id),
        eq(actorMembership.userId, userId),
        inArray(actorMembership.role, ["owner", "admin"]),
      ),
    )
    .where(
      and(
        eq(schema.organisation.id, organisationId),
        eq(schema.organisation.status, "active"),
      ),
    )
    .orderBy(asc(schema.user.name), asc(schema.organisationMembership.id));
  // An authorised roster always contains the actor. Empty also covers unknown tenants.
  if (!members.length) throw new RoleManagementError("not_found");
  return members;
}

export async function changeMembershipRole(input: {
  actorId: string;
  organisationId: string;
  membershipId: string;
  role: OrganisationRole;
}) {
  return databaseClient.db.transaction(async (tx) => {
    // All role writers lock the tenant first, then re-read current authority.
    const [organisation] = await tx
      .select({ status: schema.organisation.status })
      .from(schema.organisation)
      .where(eq(schema.organisation.id, input.organisationId))
      .for("update");
    if (!organisation || organisation.status !== "active")
      throw new RoleManagementError("not_found");
    const [actor] = await tx
      .select()
      .from(schema.organisationMembership)
      .where(
        and(
          eq(
            schema.organisationMembership.organisationId,
            input.organisationId,
          ),
          eq(schema.organisationMembership.userId, input.actorId),
        ),
      )
      .for("update");
    if (!actor || !canManageOrganisationRoles(actor.role))
      throw new RoleManagementError("not_found");
    const [target] = await tx
      .select()
      .from(schema.organisationMembership)
      .where(
        and(
          eq(
            schema.organisationMembership.organisationId,
            input.organisationId,
          ),
          eq(schema.organisationMembership.id, input.membershipId),
        ),
      )
      .for("update");
    if (!target) throw new RoleManagementError("not_found");
    if (target.role === "owner") {
      const owners = await tx
        .select({ id: schema.organisationMembership.id })
        .from(schema.organisationMembership)
        .where(
          and(
            eq(
              schema.organisationMembership.organisationId,
              input.organisationId,
            ),
            eq(schema.organisationMembership.role, "owner"),
          ),
        );
      throw new RoleManagementError(
        owners.length === 1 ? "last_owner" : "ownership_protected",
      );
    }
    // Ownership assignment/transfer is intentionally outside PB-008.
    if (input.role === "owner")
      throw new RoleManagementError("ownership_protected");
    if (target.role === input.role) return target;
    const now = new Date();
    const [updated] = await tx
      .update(schema.organisationMembership)
      .set({
        role: input.role,
        roleChangedAt: now,
        roleChangedByUserId: input.actorId,
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.organisationMembership.id, target.id),
          eq(
            schema.organisationMembership.organisationId,
            input.organisationId,
          ),
        ),
      )
      .returning();
    if (!updated) throw new RoleManagementError("not_found");
    return updated;
  });
}
