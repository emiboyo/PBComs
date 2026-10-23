import { describe, expect, it } from "vitest";
import { assertDedicatedTestDatabase } from "./test-database";

const dedicatedUrl = "postgresql://user:password@localhost:5432/pbcoms_test";

describe("assertDedicatedTestDatabase", () => {
  it("accepts a PostgreSQL database explicitly marked for tests", () => {
    expect(
      assertDedicatedTestDatabase({
        DATABASE_TEST_URL: dedicatedUrl,
        NODE_ENV: "test",
      }),
    ).toBe(dedicatedUrl);
  });

  it.each([
    [{ NODE_ENV: "test" }, "DATABASE_TEST_URL is required"],
    [
      { DATABASE_TEST_URL: "not-a-url", NODE_ENV: "test" },
      "valid PostgreSQL URL",
    ],
    [
      { DATABASE_TEST_URL: "mysql://localhost/pbcoms_test", NODE_ENV: "test" },
      "valid PostgreSQL URL",
    ],
    [
      { DATABASE_TEST_URL: "postgresql://localhost/pbcoms", NODE_ENV: "test" },
      "standalone 'test' marker",
    ],
    [
      { DATABASE_TEST_URL: dedicatedUrl, NODE_ENV: "production" },
      "cannot run in production",
    ],
  ] as const)(
    "fails closed for unsafe configuration %#",
    (environment, message) => {
      expect(() => assertDedicatedTestDatabase(environment)).toThrow(message);
    },
  );

  it.each(["DATABASE_DEVELOPMENT_URL", "DATABASE_PRODUCTION_URL"] as const)(
    "rejects a URL also configured as %s",
    (key) => {
      expect(() =>
        assertDedicatedTestDatabase({
          DATABASE_TEST_URL: dedicatedUrl,
          [key]: dedicatedUrl,
          NODE_ENV: "test",
        }),
      ).toThrow(`must not match ${key}`);
    },
  );

  it("rejects the configured application database outside the test environment", () => {
    expect(() =>
      assertDedicatedTestDatabase({
        DATABASE_TEST_URL: dedicatedUrl,
        DATABASE_URL: dedicatedUrl,
        NODE_ENV: "development",
      }),
    ).toThrow("must not match DATABASE_URL");
  });

  it("allows CI to migrate and test the same explicitly named test database", () => {
    expect(
      assertDedicatedTestDatabase({
        DATABASE_TEST_URL: dedicatedUrl,
        DATABASE_URL: dedicatedUrl,
        NODE_ENV: "test",
      }),
    ).toBe(dedicatedUrl);
  });
});
