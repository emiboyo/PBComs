import { databaseClient } from "./database";
import { schema } from "@pbcoms/database";
import { and, asc, eq } from "drizzle-orm";

export async function insertOrganisationWithOwner(input: {
  name: string;
  slug: string;
  userId: string;
}) {
  return databaseClient.db.transaction(async (tx) => {
    const [created] = await tx
      .insert(schema.organisation)
      .values({
        name: input.name,
        slug: input.slug,
        createdByUserId: input.userId,
      })
      .returning();
    if (!created) throw new Error("Organisation insert returned no record");
    const [membership] = await tx
      .insert(schema.organisationMembership)
      .values({
        organisationId: created.id,
        userId: input.userId,
        role: "owner",
      })
      .returning();
    if (!membership) throw new Error("Membership insert returned no record");
    return { ...created, role: membership.role };
  });
}

const summarySelection = {
  id: schema.organisation.id,
  name: schema.organisation.name,
  slug: schema.organisation.slug,
  status: schema.organisation.status,
  role: schema.organisationMembership.role,
  createdAt: schema.organisation.createdAt,
};

export function selectOrganisationsForUser(userId: string) {
  return databaseClient.db
    .select(summarySelection)
    .from(schema.organisationMembership)
    .innerJoin(
      schema.organisation,
      eq(schema.organisationMembership.organisationId, schema.organisation.id),
    )
    .where(eq(schema.organisationMembership.userId, userId))
    .orderBy(asc(schema.organisation.name), asc(schema.organisation.id));
}

export async function selectOrganisationForMember(
  userId: string,
  organisationId: string,
) {
  const [result] = await databaseClient.db
    .select(summarySelection)
    .from(schema.organisationMembership)
    .innerJoin(
      schema.organisation,
      eq(schema.organisationMembership.organisationId, schema.organisation.id),
    )
    .where(
      and(
        eq(schema.organisationMembership.userId, userId),
        eq(schema.organisation.id, organisationId),
      ),
    )
    .limit(1);
  return result;
}
