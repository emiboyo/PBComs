import { describe, expect, it } from "vitest";
import { parseAuthEnvironment } from "./auth-environment";

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
});
