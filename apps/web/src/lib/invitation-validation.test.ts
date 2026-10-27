import { describe, expect, it } from "vitest";
import {
  createInvitationSchema,
  invitationResponseSchema,
} from "./invitation-validation";

describe("invitation validation", () => {
  it("normalises a valid email address", () => {
    expect(
      createInvitationSchema.parse({ email: " User@Example.COM " }),
    ).toEqual({ email: "user@example.com" });
  });

  it.each(["", "not-an-email", "a@", "@example.com"])(
    "rejects invalid email %s",
    (email) => {
      expect(createInvitationSchema.safeParse({ email }).success).toBe(false);
    },
  );

  it("allows only accept or decline with a bounded URL-safe token", () => {
    const token = "a".repeat(43);
    expect(
      invitationResponseSchema.safeParse({ token, action: "accept" }).success,
    ).toBe(true);
    expect(
      invitationResponseSchema.safeParse({ token, action: "owner" }).success,
    ).toBe(false);
    expect(
      invitationResponseSchema.safeParse({ token: "short", action: "accept" })
        .success,
    ).toBe(false);
  });
});
