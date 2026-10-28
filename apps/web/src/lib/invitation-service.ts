import { authEnvironment } from "./auth-environment";
import { createEmailDelivery, type EmailDelivery } from "./email";
import {
  acceptInvitationTransaction,
  declineInvitationTransaction,
  expirePendingInvitations,
  insertInvitation,
  InvitationStateError,
  listOrganisationInvitations,
  revokeInvitationTransaction,
} from "./invitation-repository";
import {
  createInvitationSchema,
  invitationResponseSchema,
  type InvitationResponseInput,
} from "./invitation-validation";
import {
  generateInvitationToken,
  hashInvitationToken,
} from "./invitation-token";
import {
  OrganisationAccessError,
  requireOrganisationOwner,
  type OrganisationActor,
} from "./organisation-service";

const invitationLifetimeMs = 7 * 24 * 60 * 60 * 1000;

export type InvitationResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "invalid_input"
        | "already_member"
        | "duplicate_pending"
        | "not_found"
        | "email_mismatch"
        | "expired"
        | "not_pending";
      fieldErrors?: Record<string, string[]>;
    };

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if ("code" in error && error.code === "23505") return true;
  return "cause" in error && isUniqueViolation(error.cause);
}

function stateFailure(error: unknown): InvitationResult | null {
  return error instanceof InvitationStateError
    ? { ok: false, code: error.code }
    : null;
}

function requireVerifiedRecipient(actor: OrganisationActor | null) {
  if (!actor) throw new OrganisationAccessError("unauthenticated");
  if (!actor.emailVerified || !actor.email)
    throw new OrganisationAccessError("email_unverified");
  return actor.email.trim().toLowerCase();
}

export async function createOrganisationInvitation(
  actor: OrganisationActor | null,
  organisationId: string,
  input: unknown,
  options: {
    now?: Date;
    delivery?: EmailDelivery;
    applicationUrl?: string;
  } = {},
): Promise<InvitationResult> {
  if (!actor) throw new OrganisationAccessError("unauthenticated");
  if (!actor.emailVerified)
    throw new OrganisationAccessError("email_unverified");
  const organisation = await requireOrganisationOwner(actor, organisationId);
  const parsed = createInvitationSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      code: "invalid_input",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  const now = options.now ?? new Date();
  const token = generateInvitationToken();
  let invitation: Awaited<ReturnType<typeof insertInvitation>>;
  try {
    invitation = await insertInvitation({
      organisationId,
      email: parsed.data.email,
      invitedByUserId: actor!.id,
      tokenHash: hashInvitationToken(token),
      createdAt: now,
      expiresAt: new Date(now.getTime() + invitationLifetimeMs),
    });
  } catch (error) {
    const state = stateFailure(error);
    if (state) return state;
    if (isUniqueViolation(error))
      return { ok: false, code: "duplicate_pending" };
    throw error;
  }
  const applicationUrl =
    options.applicationUrl ?? authEnvironment.BETTER_AUTH_URL;
  const link = new URL(`/app/invitations/${token}`, applicationUrl).toString();
  try {
    await (options.delivery ?? createEmailDelivery(authEnvironment)).send({
      to: invitation.email,
      subject: `Invitation to join ${organisation.name} on PBcoms`,
      text: `You have been invited to join ${organisation.name} as a member. This invitation expires in seven days.\n\n${link}`,
    });
  } catch (error) {
    await revokeInvitationTransaction({
      organisationId,
      invitationId: invitation.id,
      now: new Date(),
    });
    throw error;
  }
  return { ok: true };
}

export async function getOrganisationInvitations(
  actor: OrganisationActor | null,
  organisationId: string,
) {
  await requireOrganisationOwner(actor, organisationId);
  await expirePendingInvitations(new Date());
  return listOrganisationInvitations(organisationId);
}

export async function respondToInvitation(
  actor: OrganisationActor | null,
  input: InvitationResponseInput,
  now = new Date(),
): Promise<InvitationResult & { organisationId?: string }> {
  const email = requireVerifiedRecipient(actor);
  const parsed = invitationResponseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  try {
    await expirePendingInvitations(now);
    const result =
      parsed.data.action === "accept"
        ? await acceptInvitationTransaction({
            tokenHash: hashInvitationToken(parsed.data.token),
            email,
            userId: actor!.id,
            now,
          })
        : await declineInvitationTransaction({
            tokenHash: hashInvitationToken(parsed.data.token),
            email,
            now,
          });
    return { ok: true, organisationId: result.organisationId };
  } catch (error) {
    const state = stateFailure(error);
    if (state) return state;
    if (isUniqueViolation(error)) return { ok: false, code: "already_member" };
    throw error;
  }
}

export async function revokeOrganisationInvitation(
  actor: OrganisationActor | null,
  organisationId: string,
  invitationId: string,
): Promise<InvitationResult> {
  await requireOrganisationOwner(actor, organisationId);
  try {
    await revokeInvitationTransaction({
      organisationId,
      invitationId,
      now: new Date(),
    });
    return { ok: true };
  } catch (error) {
    return stateFailure(error) ?? Promise.reject(error);
  }
}
