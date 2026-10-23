import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabaseClient, type DatabaseClient } from "./client";
import { checkDatabaseHealth } from "./health";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(packageDirectory, "../../.env"), quiet: true });
const testDatabaseUrl = process.env.DATABASE_TEST_URL;
const describeIntegration = testDatabaseUrl ? describe : describe.skip;

describeIntegration("PostgreSQL integration", () => {
  let client: DatabaseClient;

  beforeAll(() => {
    client = createDatabaseClient({ DATABASE_URL: testDatabaseUrl! });
  });

  afterAll(async () => {
    await client.close();
  });

  it("connects to the dedicated test database", async () => {
    await expect(checkDatabaseHealth(client)).resolves.toEqual({ ok: true });
  });
});
