import assert from "node:assert/strict";
import process from "node:process";
import { URL } from "node:url";
import { createRequire } from "node:module";
import { createHmac, randomUUID } from "node:crypto";
import { before, after, test } from "node:test";
/* global fetch */

// Production server and test runner must share this disposable test database/secret.
const origin = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
assert.ok(process.env.DATABASE_TEST_URL, "DATABASE_TEST_URL is required");
assert.match(new URL(process.env.DATABASE_TEST_URL).pathname, /_test$/);
const postgres = createRequire(
  new URL("../../../packages/database/package.json", import.meta.url),
)("postgres");
const sql = postgres(process.env.DATABASE_TEST_URL, { max: 1 });
const users = Object.fromEntries(
  ["owner", "admin", "member", "outsider", "unverified"].map((role) => [
    role,
    randomUUID(),
  ]),
);
const organisationId = randomUUID(),
  otherId = randomUUID();
const membershipIds = Object.fromEntries(
  Object.keys(users).map((role) => [role, randomUUID()]),
);
const cookies = {};
before(async () => {
  assert.ok(process.env.BETTER_AUTH_SECRET, "BETTER_AUTH_SECRET is required");
  for (const [role, id] of Object.entries(users)) {
    await sql`insert into "user" (id, name, email, email_verified) values (${id}, ${`HTTP ${role}`}, ${id + "@pb008.test"}, ${role !== "unverified"})`;
    const token = randomUUID();
    await sql`insert into "session" (id, token, expires_at, user_id) values (${randomUUID()}, ${token}, ${new Date(Date.now() + 3600000)}, ${id})`;
    cookies[role] =
      "__Secure-pbcoms.session_token=" +
      encodeURIComponent(
        token +
          "." +
          createHmac("sha256", process.env.BETTER_AUTH_SECRET)
            .update(token)
            .digest("base64"),
      );
  }
  await sql`insert into organisation (id, name, slug, created_by_user_id) values (${organisationId}, 'Role HTTP company', ${organisationId}, ${users.owner}), (${otherId}, 'Other HTTP company', ${otherId}, ${users.outsider})`;
  for (const role of ["owner", "admin", "member"])
    await sql`insert into organisation_membership (id, organisation_id, user_id, role) values (${membershipIds[role]}, ${organisationId}, ${users[role]}, ${role})`;
  await sql`insert into organisation_membership (id, organisation_id, user_id, role) values (${membershipIds.outsider}, ${otherId}, ${users.outsider}, 'owner')`;
});
after(async () => {
  try {
    await sql`delete from organisation_membership where organisation_id in (${organisationId}, ${otherId})`;
    await sql`delete from organisation where id in (${organisationId}, ${otherId})`;
    for (const id of Object.values(users))
      await sql`delete from "user" where id = ${id}`;
  } finally {
    await sql.end();
  }
});
const rosterPath = `/api/organisations/${organisationId}/members`;
const rolePath = (id) => `${rosterPath}/${id}/role`;
async function request(path, actor, expected, options = {}) {
  const response = await fetch(new URL(path, origin), {
    ...options,
    headers: {
      ...(actor ? { cookie: cookies[actor] } : {}),
      ...options.headers,
    },
  });
  assert.equal(response.status, expected);
  assert.match(response.headers.get("cache-control") ?? "", /\bno-store\b/);
  return response;
}
const patch = (id, actor, role, expected, extra = {}) =>
  request(rolePath(id), actor, expected, {
    method: "PATCH",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ role }),
    ...extra,
  });

for (const [actor, status] of [
  ["owner", 200],
  ["admin", 200],
  ["member", 404],
  ["outsider", 404],
  ["unverified", 403],
  [null, 401],
]) {
  test(`roster API policy: ${actor ?? "anonymous"}`, async () => {
    const response = await request(rosterPath, actor, status);
    const result = await response.json();
    if (status === 200) {
      assert.equal(result.members.length, 3);
      assert.ok(
        result.members.every((record) => !Object.hasOwn(record, "token")),
      );
    } else assert.deepEqual(Object.keys(result).sort(), ["code", "ok"]);
  });
}
test("owner role assignment succeeds with trace metadata", async () => {
  const response = await patch(membershipIds.member, "owner", "manager", 200);
  const { membership } = await response.json();
  assert.equal(membership.role, "manager");
  assert.equal(membership.roleChangedByUserId, users.owner);
  assert.ok(membership.roleChangedAt);
});
test("admin and member cannot change themselves or owners", async () => {
  for (const actor of ["admin", "member"]) {
    await patch(membershipIds[actor], actor, "owner", 404);
    await patch(membershipIds.owner, actor, "viewer", 404);
  }
});
test("last-owner demotion and new ownership assignment are rejected", async () => {
  const response = await patch(membershipIds.owner, "owner", "member", 409);
  assert.equal((await response.json()).code, "last_owner");
  await patch(membershipIds.member, "owner", "owner", 409);
});
test("role mutations reject missing/untrusted origins, anonymous and unverified users", async () => {
  for (const headers of [{}, { origin: "https://untrusted.example" }])
    await patch(membershipIds.member, "owner", "staff", 403, { headers });
  await patch(membershipIds.member, null, "staff", 401);
  await patch(membershipIds.member, "unverified", "staff", 403);
});
test("role mutations reject invalid inputs, tenant IDs and missing memberships", async () => {
  await patch(membershipIds.member, "owner", "superadmin", 400);
  await patch(membershipIds.member, "owner", "admin", 400, { body: "{" });
  await patch("not-a-uuid", "owner", "admin", 404);
  await patch(randomUUID(), "owner", "admin", 404);
  await patch(membershipIds.outsider, "owner", "admin", 404);
  await request("/api/organisations/not-a-uuid/members", "owner", 404);
});
test("owner UI provides role controls; admin UI is read-only; member UI is denied", async () => {
  const path = `/app/organisations/${organisationId}/members`;
  const owner = await fetch(new URL(path, origin), {
    headers: { cookie: cookies.owner },
  });
  assert.equal(owner.status, 200);
  const html = await owner.text();
  assert.match(html, /The final owner cannot be demoted/);
  assert.match(html, /Save role/);
  assert.match(html, /<select/);
  const admin = await fetch(new URL(path, origin), {
    headers: { cookie: cookies.admin },
  });
  assert.equal(admin.status, 200);
  const readonly = await admin.text();
  assert.match(readonly, /roster access is read-only/);
  assert.doesNotMatch(readonly, /<select/);
  const member = await fetch(new URL(path, origin), {
    headers: { cookie: cookies.member },
  });
  assert.equal(member.status, 404);
});
test("suspended organisations reject role mutations and roster requests", async () => {
  await sql`update organisation set status = 'suspended' where id = ${organisationId}`;
  await patch(membershipIds.member, "owner", "staff", 404);
  await request(rosterPath, "owner", 404);
});
