import { describe, expect, it } from "vitest";
import { parseDatabaseEnvironment } from "./environment";

describe("parseDatabaseEnvironment", () => {
  it("accepts a PostgreSQL URL", () => {
    expect(
      parseDatabaseEnvironment({
        DATABASE_URL: "postgresql://user:password@localhost:5432/test",
      }),
    ).toEqual({
      DATABASE_URL: "postgresql://user:password@localhost:5432/test",
    });
  });

  it("rejects a missing DATABASE_URL", () => {
    expect(() => parseDatabaseEnvironment({})).toThrow(
      "DATABASE_URL is required.",
    );
  });

  it("rejects a non-PostgreSQL URL", () => {
    expect(() =>
      parseDatabaseEnvironment({ DATABASE_URL: "https://example.com" }),
    ).toThrow("DATABASE_URL must be a PostgreSQL connection URL.");
  });
});
