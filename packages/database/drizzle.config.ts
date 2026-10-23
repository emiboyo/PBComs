import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDatabaseEnvironment } from "./src/environment";

const packageDirectory = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(packageDirectory, "../../.env"), quiet: true });
const { DATABASE_URL } = parseDatabaseEnvironment(process.env);

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dbCredentials: { url: DATABASE_URL },
  strict: true,
  verbose: true,
});
