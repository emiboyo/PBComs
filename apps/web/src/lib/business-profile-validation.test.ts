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
