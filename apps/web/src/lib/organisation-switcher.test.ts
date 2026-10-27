import { describe, expect, it } from "vitest";
import {
  OrganisationAccessError,
  selectActiveOrganisation,
  type OrganisationSummary,
} from "./organisation-service";

const organisation = (
  id: string,
  name: string,
  status: OrganisationSummary["status"] = "active",
): OrganisationSummary => ({
  id,
  name,
  tradingName: null,
  slug: name.toLowerCase(),
  status,
  role: "owner",
  createdAt: new Date("2026-01-01T00:00:00Z"),
});

describe("active organisation selection", () => {
  const active = organisation("active", "Active");
  const suspended = organisation("suspended", "Suspended", "suspended");
  const archived = organisation("archived", "Archived", "archived");

  it("selects a current active membership", () => {
    expect(
      selectActiveOrganisation([active, suspended, archived], active.id),
    ).toBe(active);
  });

  it.each(["missing", suspended.id, archived.id])(
    "rejects an invalid or unavailable selection: %s",
    (id) => {
      expect(() =>
        selectActiveOrganisation([active, suspended, archived], id),
      ).toThrowError(OrganisationAccessError);
    },
  );

  it("rejects selection from an empty organisation list", () => {
    expect(() => selectActiveOrganisation([], active.id)).toThrowError(
      OrganisationAccessError,
    );
  });
});
