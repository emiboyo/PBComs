import { config } from "dotenv";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  mkdtemp,
  mkdir,
  copyFile,
  readFile,
  writeFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { expect, it } from "vitest";
import { assertDedicatedTestDatabase } from "./test-database";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, "../../.env"), quiet: true });

it("upgrades PB-007 owner/member data non-destructively on a clean disposable database", async () => {
  const baseUrl = assertDedicatedTestDatabase(process.env);
  const admin = postgres(baseUrl, { max: 1, onnotice: () => {} });
  const databaseName = `pb008_${randomUUID().replaceAll("-", "")}_test`;
  const url = new URL(baseUrl);
  url.pathname = `/${databaseName}`;
  const directory = await mkdtemp(join(tmpdir(), "pb008-migrations-"));
  let created = false;
  const sql = postgres(url.toString(), { max: 1, onnotice: () => {} });
  try {
    // Test-only database credentials need CREATEDB; no production connection is used.
    await admin`create database ${admin(databaseName)}`;
    created = true;
    const journal = JSON.parse(
      await readFile(join(root, "migrations/meta/_journal.json"), "utf8"),
    ) as { entries: { idx: number; tag: string }[] };
    const historical = {
      ...journal,
      entries: journal.entries.filter((entry) => entry.idx <= 3),
    };
    await mkdir(join(directory, "meta"));
    await writeFile(
      join(directory, "meta/_journal.json"),
      JSON.stringify(historical),
    );
    for (const entry of historical.entries)
      await copyFile(
        join(root, "migrations", `${entry.tag}.sql`),
        join(directory, `${entry.tag}.sql`),
      );
    await migrate(drizzle(sql), { migrationsFolder: directory });
    await sql`insert into "user" (id, name, email, email_verified) values ('legacy-owner', 'Owner', 'owner@migration.test', true), ('legacy-member', 'Member', 'member@migration.test', true)`;
    const organisationId = randomUUID(),
      ownerId = randomUUID(),
      memberId = randomUUID();
    await sql`insert into organisation (id, name, slug, created_by_user_id) values (${organisationId}, 'Legacy company', 'legacy-company', 'legacy-owner')`;
    await sql`insert into organisation_membership (id, organisation_id, user_id, role) values (${ownerId}, ${organisationId}, 'legacy-owner', 'owner'), (${memberId}, ${organisationId}, 'legacy-member', 'member')`;
    await sql`insert into organisation_invitation (organisation_id, email, invited_by_user_id, token_hash, expires_at) values (${organisationId}, 'pending@migration.test', 'legacy-owner', ${"f".repeat(64)}, now() + interval '7 days')`;
    const before =
      await sql`select id, organisation_id, user_id, role, created_at, updated_at from organisation_membership order by id`;
    await migrate(drizzle(sql), { migrationsFolder: join(root, "migrations") });
    const after =
      await sql`select id, organisation_id, user_id, role, created_at, updated_at from organisation_membership order by id`;
    expect([...after]).toEqual([...before]);
    const metadata =
      await sql`select role_changed_at, role_changed_by_user_id from organisation_membership`;
    expect(
      metadata.every(
        (row) =>
          row.role_changed_at === null && row.role_changed_by_user_id === null,
      ),
    ).toBe(true);
    const [pending] =
      await sql`select role, status, token_hash from organisation_invitation`;
    expect(pending).toMatchObject({
      role: "member",
      status: "pending",
      token_hash: "f".repeat(64),
    });
    for (const role of ["admin", "manager", "staff", "viewer", "member"]) {
      await sql`update organisation_membership set role = ${role} where id = ${memberId}`;
    }
    await expect(
      sql`update organisation_membership set role = 'root' where id = ${memberId}`,
    ).rejects.toMatchObject({ code: "23514" });
    const [defaultRole] =
      await sql`select column_default from information_schema.columns where table_name = 'organisation_membership' and column_name = 'role'`;
    expect(defaultRole?.column_default).toContain("member");
    expect(
      (
        await sql`select role from organisation_membership where id = ${ownerId}`
      )[0]?.role,
    ).toBe("owner");
    // A repeat migration is a no-op rather than a second data transformation.
    await migrate(drizzle(sql), { migrationsFolder: join(root, "migrations") });
  } finally {
    await sql.end();
    if (created) await admin`drop database ${admin(databaseName)}`;
    await admin.end();
    await rm(directory, { recursive: true, force: true });
  }
}, 30000);
