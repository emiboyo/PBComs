import type { OrganisationActor } from "./organisation-service";
import {
  changeMembershipRole,
  selectOrganisationRoster,
} from "./membership-repository";
import {
  membershipIdSchema,
  roleChangeSchema,
  RoleManagementError,
} from "./role-management-policy";

function requireActor(actor: OrganisationActor | null) {
  if (!actor) throw new RoleManagementError("unauthenticated");
  if (!actor.emailVerified) throw new RoleManagementError("email_unverified");
  return actor;
}
function requireOrganisationId(organisationId: string) {
  if (!membershipIdSchema.safeParse(organisationId).success)
    throw new RoleManagementError("not_found");
}
export async function listOrganisationMembers(
  actor: OrganisationActor | null,
  organisationId: string,
) {
  const verified = requireActor(actor);
  requireOrganisationId(organisationId);
  return selectOrganisationRoster(verified.id, organisationId);
}
export async function getOrganisationMemberRole(
  actor: OrganisationActor | null,
  organisationId: string,
  membershipId: string,
) {
  const members = await listOrganisationMembers(actor, organisationId);
  const member = members.find((item) => item.id === membershipId);
  if (!member) throw new RoleManagementError("not_found");
  return member.role;
}
export async function assignOrganisationRole(
  actor: OrganisationActor | null,
  organisationId: string,
  membershipId: string,
  input: unknown,
) {
  const verified = requireActor(actor);
  requireOrganisationId(organisationId);
  if (!membershipIdSchema.safeParse(membershipId).success)
    throw new RoleManagementError("not_found");
  const parsed = roleChangeSchema.safeParse(input);
  if (!parsed.success) throw new RoleManagementError("invalid_input");
  const result = await changeMembershipRole({
    actorId: verified.id,
    organisationId,
    membershipId,
    role: parsed.data.role,
  });
  return {
    id: result.id,
    role: result.role,
    roleChangedAt: result.roleChangedAt,
    roleChangedByUserId: result.roleChangedByUserId,
  };
}
