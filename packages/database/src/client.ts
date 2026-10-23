import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import { parseDatabaseEnvironment } from "./environment";
import * as schema from "./schema";

export interface DatabaseClient {
  readonly db: PostgresJsDatabase<typeof schema>;
  readonly sql: Sql;
  close(): Promise<void>;
}

export interface DatabaseClientOptions {
  maxConnections?: number;
  connectionTimeoutSeconds?: number;
  idleTimeoutSeconds?: number;
}

export function createDatabaseClient(
  environment: Record<string, string | undefined> = process.env,
  options: DatabaseClientOptions = {},
): DatabaseClient {
  const { DATABASE_URL } = parseDatabaseEnvironment(environment);
  const sql = postgres(DATABASE_URL, {
    max: options.maxConnections ?? 10,
    connect_timeout: options.connectionTimeoutSeconds ?? 10,
    idle_timeout: options.idleTimeoutSeconds ?? 20,
  });

  return { db: drizzle(sql, { schema }), sql, close: async () => sql.end() };
}
