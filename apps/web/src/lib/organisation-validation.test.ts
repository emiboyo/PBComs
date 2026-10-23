import { describe, expect, it } from "vitest";
import {
  createOrganisationInputSchema,
  normaliseOrganisationSlug,
  organisationSlugSchema,
} from "./organisation-validation";

describe("organisation validation", () => {
  it("normalises names into predictable URL-safe slugs", () => {
    expect(normaliseOrganisationSlug("  Café & Trading Ltd. ")).toBe(
      "cafe-trading-ltd",
    );
  });

  it.each([
    "admin",
    "api",
    "app",
    "auth",
    "login",
    "register",
    "support",
    "system",
  ])("rejects reserved slug %s", (slug) =>
    expect(organisationSlugSchema.safeParse(slug).success).toBe(false),
  );

  it.each([
    "Uppercase",
    "two words",
    "-leading",
    "trailing-",
    "bad_underscore",
  ])("rejects invalid slug %s", (slug) =>
    expect(organisationSlugSchema.safeParse(slug).success).toBe(false),
  );

  it("rejects blank, short, and overlong names", () => {
    expect(createOrganisationInputSchema.safeParse({ name: " " }).success).toBe(
      false,
    );
    expect(createOrganisationInputSchema.safeParse({ name: "x" }).success).toBe(
      false,
    );
    expect(
      createOrganisationInputSchema.safeParse({ name: "x".repeat(121) })
        .success,
    ).toBe(false);
  });
});
