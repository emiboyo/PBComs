import {
  requireOrganisationMembership,
  requireOrganisationOwner,
  type OrganisationActor,
} from "./organisation-service";
import {
  selectBusinessProfile,
  upsertBusinessProfile,
} from "./business-profile-repository";
import {
  completeBusinessProfileSchema,
  draftBusinessProfileSchema,
  type DraftBusinessProfileInput,
} from "./business-profile-validation";

export type BusinessProfileResult =
  | { ok: true; profile: Awaited<ReturnType<typeof selectBusinessProfile>> }
  | { ok: false; code: "invalid_input"; fieldErrors: Record<string, string[]> };

export async function getBusinessProfile(
  actor: OrganisationActor | null,
  organisationId: string,
) {
  const organisation = await requireOrganisationMembership(
    actor,
    organisationId,
  );
  const data = await selectBusinessProfile(organisationId);
  return {
    organisation,
    ...data,
    status: data.profile?.onboardingStatus ?? ("not_started" as const),
  };
}

export async function saveBusinessProfileDraft(
  actor: OrganisationActor | null,
  organisationId: string,
  input: DraftBusinessProfileInput,
): Promise<BusinessProfileResult> {
  if (!actor?.emailVerified) {
    if (!actor) await requireOrganisationOwner(actor, organisationId);
    const { OrganisationAccessError } = await import("./organisation-service");
    throw new OrganisationAccessError("email_unverified");
  }
  await requireOrganisationOwner(actor, organisationId);
  const parsed = draftBusinessProfileSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      code: "invalid_input",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  const { activities, currentStep, ...fields } = parsed.data;
  const existing = await selectBusinessProfile(organisationId);
  await upsertBusinessProfile(
    organisationId,
    {
      ...fields,
      currentStep: String(currentStep ?? 1),
      onboardingStatus:
        existing.profile?.onboardingStatus === "completed"
          ? "completed"
          : "in_progress",
    },
    activities,
  );
  return { ok: true, profile: await selectBusinessProfile(organisationId) };
}

export async function completeBusinessOnboarding(
  actor: OrganisationActor | null,
  organisationId: string,
  input: DraftBusinessProfileInput,
): Promise<BusinessProfileResult> {
  if (!actor?.emailVerified) {
    if (!actor) await requireOrganisationOwner(actor, organisationId);
    const { OrganisationAccessError } = await import("./organisation-service");
    throw new OrganisationAccessError("email_unverified");
  }
  await requireOrganisationOwner(actor, organisationId);
  const parsed = completeBusinessProfileSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      code: "invalid_input",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  const existing = await selectBusinessProfile(organisationId);
  const { activities, currentStep, ...fields } = parsed.data;
  void currentStep;
  await upsertBusinessProfile(
    organisationId,
    {
      ...fields,
      currentStep: "4",
      onboardingStatus: "completed",
      completedAt: existing.profile?.completedAt ?? new Date(),
    },
    activities,
  );
  return { ok: true, profile: await selectBusinessProfile(organisationId) };
}
