import { describe, expect, it } from "vitest";
import {
  completeBusinessProfileSchema,
  draftBusinessProfileSchema,
} from "./business-profile-validation";

const complete = {
  tradingName: "PearlBridge",
  businessStructure: "company",
  registrationCountry: "NG",
  description: "International commerce business",
  businessEmail: "hello@example.ng",
  operatingCountry: "NG",
  addressLine1: "12 Marina",
  city: "Lagos",
  activities: ["retail", "wholesale"],
};

describe("business profile validation", () => {
  it("accepts incomplete international drafts", () =>
    expect(
      draftBusinessProfileSchema.safeParse({
        registrationCountry: "ng",
        postalCode: "",
      }).success,
    ).toBe(true));
  it("accepts multiple activities and optional identifiers", () =>
    expect(completeBusinessProfileSchema.safeParse(complete).success).toBe(
      true,
    ));
  it.each(["GB", "NG", "US", "BR", "JP", "ZA", "IN", "AU", "DE", "AQ"])(
    "accepts ISO 3166-1 code %s",
    (country) => {
      expect(
        completeBusinessProfileSchema.safeParse({
          ...complete,
          registrationCountry: country,
          operatingCountry: country,
        }).success,
      ).toBe(true);
    },
  );
  it.each(["ZZ", "UK", "XX", "AA", "EU", "USA"])(
    "rejects non-ISO country code %s in drafts and completion",
    (country) => {
      expect(
        draftBusinessProfileSchema.safeParse({
          registrationCountry: country,
        }).success,
      ).toBe(false);
      expect(
        completeBusinessProfileSchema.safeParse({
          ...complete,
          operatingCountry: country,
        }).success,
      ).toBe(false);
    },
  );
  it("preserves omitted draft fields while normalising explicit empty optional values", () => {
    expect(draftBusinessProfileSchema.parse({ website: "" })).toEqual({
      website: null,
    });
    expect(draftBusinessProfileSchema.parse({ city: "Lagos" })).toEqual({
      city: "Lagos",
    });
  });
  it("rejects duplicate commercial activities", () => {
    const result = draftBusinessProfileSchema.safeParse({
      activities: ["retail", "retail"],
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.flatten().fieldErrors.activities).toContain(
        "Select each business activity only once.",
      );
  });
  it("requires activities and rejects invalid country and website values", () => {
    const result = completeBusinessProfileSchema.safeParse({
      ...complete,
      activities: [],
      registrationCountry: "United Kingdom",
      website: "example",
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.flatten().fieldErrors).toMatchObject({
        activities: expect.any(Array),
        registrationCountry: expect.any(Array),
        website: expect.any(Array),
      });
  });
});
