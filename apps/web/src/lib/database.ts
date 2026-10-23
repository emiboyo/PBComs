import { createDatabaseClient } from "@pbcoms/database";

const globalDatabase = globalThis as typeof globalThis & {
  pbcomsDatabase?: ReturnType<typeof createDatabaseClient>;
};

export const databaseClient =
  globalDatabase.pbcomsDatabase ??
  createDatabaseClient(process.env, { maxConnections: 10 });

if (process.env.NODE_ENV !== "production")
  globalDatabase.pbcomsDatabase = databaseClient;
