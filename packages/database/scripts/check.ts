import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkDatabaseHealth, createDatabaseClient } from "../src/index";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(scriptDirectory, "../../../.env"), quiet: true });
const client = createDatabaseClient();

try {
  const health = await checkDatabaseHealth(client);
  if (!health.ok) throw new Error(health.error);
  console.log("Database connection successful.");
} finally {
  await client.close();
}
