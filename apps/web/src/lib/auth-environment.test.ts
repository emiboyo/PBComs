import { describe, expect, it } from "vitest";
import {
  documentedAuthSecretPlaceholder,
  parseAuthEnvironment,
} from "./auth-environment";

const valid = {
  BETTER_AUTH_SECRET: "a-secure-test-secret-containing-more-than-32-characters",
  BETTER_AUTH_URL: "http://localhost:3000",
  EMAIL_DELIVERY_MODE: "preview",
  NODE_ENV: "test",
};

describe("authentication environment", () => {
  it("accepts safe test configuration", () => {
    expect(parseAuthEnvironment(valid).BETTER_AUTH_URL).toBe(
      "http://localhost:3000",
    );
  });

  it("rejects a missing secret", () => {
    expect(() =>
      parseAuthEnvironment({ ...valid, BETTER_AUTH_SECRET: undefined }),
    ).toThrow("BETTER_AUTH_SECRET");
  });

  it("rejects preview email delivery in production", () => {
    expect(() =>
      parseAuthEnvironment({ ...valid, NODE_ENV: "production" }),
    ).toThrow("Production requires EMAIL_DELIVERY_MODE=smtp");
  });

  it.each(["no-reply@example.com", "PBcoms <no-reply@example.com>"])(
    "accepts the SMTP sender format %s",
    (smtpFrom) => {
      expect(() =>
        parseAuthEnvironment({
          ...valid,
          EMAIL_DELIVERY_MODE: "smtp",
          SMTP_HOST: "smtp.example.com",
          SMTP_PORT: "587",
          SMTP_USER: "user",
          SMTP_PASSWORD: "password",
          SMTP_FROM: smtpFrom,
        }),
      ).not.toThrow();
    },
  );

  it("rejects the documented authentication secret placeholder in production", () => {
    expect(() =>
      parseAuthEnvironment({
        ...valid,
        NODE_ENV: "production",
        BETTER_AUTH_SECRET: documentedAuthSecretPlaceholder,
        EMAIL_DELIVERY_MODE: "smtp",
        SMTP_HOST: "smtp.example.com",
        SMTP_PORT: "587",
        SMTP_USER: "user",
        SMTP_PASSWORD: "password",
        SMTP_FROM: "PBcoms <no-reply@example.com>",
      }),
    ).toThrow(
      "Production cannot use the documented BETTER_AUTH_SECRET placeholder",
    );
  });
});
