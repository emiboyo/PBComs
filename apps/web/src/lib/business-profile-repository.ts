import { schema } from "@pbcoms/database";
import { asc, eq } from "drizzle-orm";
import { databaseClient } from "./database";

export async function selectBusinessProfile(organisationId: string) {
  const [profile] = await databaseClient.db
    .select()
    .from(schema.businessProfile)
    .where(eq(schema.businessProfile.organisationId, organisationId))
    .limit(1);
  const activities = await databaseClient.db
    .select({
      code: schema.businessActivityType.code,
      label: schema.businessActivityType.label,
    })
    .from(schema.organisationBusinessActivity)
    .innerJoin(
      schema.businessActivityType,
      eq(
        schema.organisationBusinessActivity.activityCode,
        schema.businessActivityType.code,
      ),
    )
    .where(
      eq(schema.organisationBusinessActivity.organisationId, organisationId),
    )
    .orderBy(asc(schema.businessActivityType.label));
  return { profile: profile ?? null, activities };
}

export async function upsertBusinessProfile(
  organisationId: string,
  values: Record<string, unknown>,
  activities?: string[],
) {
  return databaseClient.db.transaction(async (tx) => {
    const [profile] = await tx
      .insert(schema.businessProfile)
      .values({ organisationId, ...values })
      .onConflictDoUpdate({
        target: schema.businessProfile.organisationId,
        set: { ...values, updatedAt: new Date() },
      })
      .returning();
    if (activities) {
      await tx
        .delete(schema.organisationBusinessActivity)
        .where(
          eq(
            schema.organisationBusinessActivity.organisationId,
            organisationId,
          ),
        );
      if (activities.length)
        await tx.insert(schema.organisationBusinessActivity).values(
          activities.map((activityCode) => ({
            organisationId,
            activityCode,
          })),
        );
    }
    return profile!;
  });
}
