import { describe, expect, it } from "vitest";
import { registrationSchema, safeRedirect } from "./auth-validation";

const valid = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  password: "SecurePassword1",
  passwordConfirmation: "SecurePassword1",
};

describe("registration validation", () => {
  it("normalises valid registration input", () => {
    expect(
      registrationSchema.parse({ ...valid, email: " ADA@EXAMPLE.COM " }).email,
    ).toBe("ada@example.com");
  });

  it("rejects invalid email addresses", () => {
    expect(
      registrationSchema.safeParse({ ...valid, email: "invalid" }).success,
    ).toBe(false);
  });

  it("enforces password strength", () => {
    expect(
      registrationSchema.safeParse({
        ...valid,
        password: "short",
        passwordConfirmation: "short",
      }).success,
    ).toBe(false);
  });

  it("rejects a password confirmation mismatch", () => {
    expect(
      registrationSchema.safeParse({
        ...valid,
        passwordConfirmation: "DifferentPassword1",
      }).success,
    ).toBe(false);
  });
});

describe("safeRedirect", () => {
  it("allows local absolute paths", () => {
    expect(safeRedirect("/app/dashboard")).toBe("/app/dashboard");
  });

  it.each([
    "https://attacker.example",
    "//attacker.example",
    "/\\attacker.example",
  ])("rejects unsafe destination %s", (destination) =>
    expect(safeRedirect(destination)).toBe("/app/dashboard"),
  );
});
