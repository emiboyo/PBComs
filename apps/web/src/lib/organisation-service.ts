import {
  createOrganisationInputSchema,
  normaliseOrganisationSlug,
  organisationSlugSchema,
  type CreateOrganisationInput,
} from "./organisation-validation";
import {
  insertOrganisationWithOwner,
  selectOrganisationForMember,
  selectOrganisationsForUser,
} from "./organisation-repository";

export type OrganisationActor = { id: string; emailVerified: boolean };
export type OrganisationSummary = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended" | "archived";
  role: "owner";
  createdAt: Date;
};

export class OrganisationAccessError extends Error {
  constructor(
    readonly code: "unauthenticated" | "email_unverified" | "not_found",
  ) {
    super(code);
  }
}

export type CreateOrganisationResult =
  | { ok: true; organisation: OrganisationSummary }
  | {
      ok: false;
      code: "invalid_input" | "slug_taken";
      fieldErrors?: Record<string, string[]>;
    };

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("code" in error && error.code === "23505") return true;
  return "cause" in error && isUniqueViolation(error.cause);
}

export async function createOrganisation(
  actor: OrganisationActor | null,
  input: CreateOrganisationInput,
): Promise<CreateOrganisationResult> {
  if (!actor) throw new OrganisationAccessError("unauthenticated");
  if (!actor.emailVerified)
    throw new OrganisationAccessError("email_unverified");
  const parsed = createOrganisationInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      code: "invalid_input",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };

  const suppliedSlug =
    parsed.data.slug !== undefined && parsed.data.slug !== "";
  const baseSlug = suppliedSlug
    ? parsed.data.slug!.trim()
    : normaliseOrganisationSlug(parsed.data.name);
  const validatedSlug = organisationSlugSchema.safeParse(baseSlug);
  if (!validatedSlug.success) {
    return {
      ok: false,
      code: "invalid_input",
      fieldErrors: {
        slug: validatedSlug.error.issues.map((issue) => issue.message),
      },
    };
  }

  for (let attempt = 0; attempt < (suppliedSlug ? 1 : 20); attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${attempt + 1}`;
    const slug = `${baseSlug.slice(0, 63 - suffix.length).replace(/-+$/g, "")}${suffix}`;
    try {
      const organisation = await insertOrganisationWithOwner({
        name: parsed.data.name,
        slug,
        userId: actor.id,
      });
      return { ok: true as const, organisation };
    } catch (error) {
      if (isUniqueViolation(error)) {
        if (suppliedSlug) return { ok: false, code: "slug_taken" };
        continue;
      }
      throw error;
    }
  }
  return { ok: false, code: "slug_taken" };
}

export async function getOrganisationsForUser(
  actor: OrganisationActor | null,
): Promise<OrganisationSummary[]> {
  if (!actor) throw new OrganisationAccessError("unauthenticated");
  return selectOrganisationsForUser(actor.id);
}

export async function requireOrganisationMembership(
  actor: OrganisationActor | null,
  organisationId: string,
) {
  if (!actor) throw new OrganisationAccessError("unauthenticated");
  const result = await selectOrganisationForMember(actor.id, organisationId);
  if (!result) throw new OrganisationAccessError("not_found");
  return result;
}

export async function requireOrganisationOwner(
  actor: OrganisationActor | null,
  organisationId: string,
) {
  const result = await requireOrganisationMembership(actor, organisationId);
  if (result.role !== "owner") throw new OrganisationAccessError("not_found");
  return result;
}
