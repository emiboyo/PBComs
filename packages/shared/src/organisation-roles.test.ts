import { describe, expect, it } from "vitest";
import {
  assignableOrganisationRoles,
  canManageOrganisationRoles,
  canViewOrganisationRoster,
  organisationRoleCodes,
  organisationRoles,
} from "./organisation-roles";

describe("tenant system roles", () => {
  it("defines stable system codes and retains the transitional member", () => {
    expect(organisationRoleCodes).toEqual([
      "owner",
      "admin",
      "manager",
      "staff",
      "viewer",
      "member",
    ]);
    for (const role of organisationRoleCodes)
      expect(organisationRoles[role].description).toBeTruthy();
    expect(assignableOrganisationRoles).not.toContain("owner");
    expect(assignableOrganisationRoles).toContain("member");
  });
  it.each(organisationRoleCodes)(
    "only owners manage roles; roster policy for %s",
    (role) => {
      expect(canManageOrganisationRoles(role)).toBe(role === "owner");
      expect(canViewOrganisationRoster(role)).toBe(
        role === "owner" || role === "admin",
      );
    },
  );
});
