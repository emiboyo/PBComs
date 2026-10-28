/** Stable, tenant-scoped system codes. Names do not grant operational powers. */
export const organisationRoleCodes = [
  "owner",
  "admin",
  "manager",
  "staff",
  "viewer",
  "member",
] as const;
export type OrganisationRole = (typeof organisationRoleCodes)[number];
export const organisationRoles: Record<
  OrganisationRole,
  { label: string; description: string }
> = {
  owner: {
    label: "Owner",
    description:
      "Organisation ownership and existing owner-only administration.",
  },
  admin: {
    label: "Admin",
    description:
      "General administration role; roster viewing only until permissions are introduced.",
  },
  manager: {
    label: "Manager",
    description:
      "Day-to-day management role; no additional operational powers yet.",
  },
  staff: {
    label: "Staff",
    description:
      "Standard operational participation; no additional operational powers yet.",
  },
  viewer: {
    label: "Viewer",
    description: "Membership-scoped read-only participation.",
  },
  member: {
    label: "Member",
    description:
      "Transitional invitation role; existing read access is preserved.",
  },
};
export const assignableOrganisationRoles = [
  "admin",
  "manager",
  "staff",
  "viewer",
  "member",
] as const;
export function canManageOrganisationRoles(role: OrganisationRole) {
  return role === "owner";
}
export function canViewOrganisationRoster(role: OrganisationRole) {
  return role === "owner" || role === "admin";
}
