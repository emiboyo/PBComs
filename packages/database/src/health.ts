import { sql as query } from "drizzle-orm";
import type { DatabaseClient } from "./client";

export type DatabaseHealth =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: "Database connection failed." };

export async function checkDatabaseHealth(
  client: Pick<DatabaseClient, "db">,
): Promise<DatabaseHealth> {
  try {
    await client.db.execute(query`select 1`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Database connection failed." };
  }
}
