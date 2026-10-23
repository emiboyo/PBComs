import { describe, expect, it } from "vitest";
import { createDatabaseClient } from "./client";
import { checkDatabaseHealth } from "./health";

describe("database client", () => {
  it("initialises lazily and can close without opening a connection", async () => {
    const client = createDatabaseClient({
      DATABASE_URL: "postgresql://user:password@localhost:1/test",
    });
    expect(client.db).toBeDefined();
    await expect(client.close()).resolves.toBeUndefined();
  });

  it("returns a safe result when the connection fails", async () => {
    const client = createDatabaseClient(
      { DATABASE_URL: "postgresql://user:password@127.0.0.1:1/test" },
      { connectionTimeoutSeconds: 1 },
    );
    await expect(checkDatabaseHealth(client)).resolves.toEqual({
      ok: false,
      error: "Database connection failed.",
    });
    await client.close();
  });
});
