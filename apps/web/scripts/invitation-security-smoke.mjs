import assert from "node:assert/strict";
import process from "node:process";
import { URL } from "node:url";
import { after, before, test } from "node:test";
import { createRequire } from "node:module";
import { createHash, createHmac, randomUUID } from "node:crypto";

/* global fetch */

// Run against a production server using the same dedicated test database.
// Fixtures are removed after the checks; never run against development data.
const origin = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const token = "pb007-http-smoke-token-" + "x".repeat(24);
const invitationPath = `/app/invitations/${token}`;
const databaseUrl = process.env.DATABASE_TEST_URL;
assert.ok(databaseUrl, "DATABASE_TEST_URL is required");
assert.match(new URL(databaseUrl).pathname, /_test$/);
const postgres = createRequire(
  new URL("../../../packages/database/package.json", import.meta.url),
)("postgres");
const sql = postgres(databaseUrl, { max: 1 });
const userId = randomUUID();
const organisationId = randomUUID();
const sessionToken = randomUUID();
const actionTokens = {
  accept: randomUUID().replaceAll("-", "") + "x".repeat(11),
  decline: randomUUID().replaceAll("-", "") + "x".repeat(11),
};
let cookie;

before(async () => {
  assert.ok(process.env.BETTER_AUTH_SECRET, "BETTER_AUTH_SECRET is required");
  await sql`insert into "user" (id, name, email, email_verified) values (${userId}, 'HTTP smoke', ${userId + "@smoke.test"}, true)`;
  await sql`insert into "session" (id, token, expires_at, user_id) values (${randomUUID()}, ${sessionToken}, ${new Date(Date.now() + 3600000)}, ${userId})`;
  await sql`insert into organisation (id, name, slug, created_by_user_id) values (${organisationId}, 'HTTP smoke', ${organisationId}, ${userId})`;
  for (const value of Object.values(actionTokens)) {
    // Different organisations avoid the pending-email uniqueness constraint.
    const org = value === actionTokens.accept ? organisationId : randomUUID();
    if (org !== organisationId)
      await sql`insert into organisation (id, name, slug, created_by_user_id) values (${org}, 'HTTP smoke', ${org}, ${userId})`;
    await sql`insert into organisation_invitation (organisation_id, email, invited_by_user_id, token_hash, expires_at) values (${org}, ${userId + "@smoke.test"}, ${userId}, ${createHash("sha256").update(value).digest("hex")}, ${new Date(Date.now() + 3600000)})`;
  }
  const signature = createHmac("sha256", process.env.BETTER_AUTH_SECRET)
    .update(sessionToken)
    .digest("base64");
  cookie =
    "__Secure-pbcoms.session_token=" +
    encodeURIComponent(sessionToken + "." + signature);
});

after(async () => {
  try {
    await sql`delete from organisation_invitation where invited_by_user_id = ${userId}`;
    await sql`delete from organisation_membership where user_id = ${userId}`;
    await sql`delete from organisation where created_by_user_id = ${userId}`;
    await sql`delete from "user" where id = ${userId}`;
  } finally {
    await sql.end();
  }
});

function assertNoStore(response) {
  assert.match(response.headers.get("cache-control") ?? "", /\bno-store\b/i);
  assert.doesNotMatch(
    response.headers.get("cache-control") ?? "",
    /\bpublic\b|s-maxage=[1-9]|(?:^|[, ])max-age=[1-9]/i,
  );
}

for (const rsc of [false, true]) {
  test(`invitation and login redirect are protected (RSC=${rsc})`, async () => {
    const response = await fetch(new URL(invitationPath, origin), {
      redirect: "manual",
      headers: rsc ? { RSC: "1" } : {},
    });
    assert.equal(response.status, rsc ? 200 : 307);
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
    assertNoStore(response);
    const location = `/login?next=${encodeURIComponent(invitationPath)}`;
    if (rsc) {
      // Flight encodes server-component redirects in the response payload.
      assert.ok((await response.text()).includes(location));
    } else {
      assert.equal(response.headers.get("location"), location);
    }
    const login = await fetch(new URL(location, origin));
    assert.equal(login.status, 200);
    assert.equal(login.headers.get("referrer-policy"), "no-referrer");
    assertNoStore(login);
    assert.match(
      await login.text(),
      /<meta name="referrer" content="no-referrer"/,
    );
  });
}

for (const [name, headers, body, status] of [
  ["untrusted origin", { origin: "https://untrusted.example" }, {}, 403],
  ["missing origin", {}, {}, 403],
  ["unauthenticated", { origin }, { token, action: "accept" }, 401],
  ["invalid JSON", { origin }, "{", 400],
]) {
  test(`invitation response is non-cacheable: ${name}`, async () => {
    const response = await fetch(new URL("/api/invitations/respond", origin), {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
    assert.equal(response.status, status);
    assertNoStore(response);
    assert.ok(!(await response.text()).includes(token));
  });
}

test("authenticated invitation HTML is protected", async () => {
  const response = await fetch(new URL(invitationPath, origin), {
    redirect: "manual",
    headers: { cookie },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assertNoStore(response);
  const html = await response.text();
  assert.match(html, /<meta name="referrer" content="no-referrer"/);
  assert.match(html, /Accept invitation/);
  // Layout and invitation page should load only same-origin resources.
  assert.doesNotMatch(html, /<(?:script|img|iframe)[^>]+src=["']https?:/i);
});

for (const action of ["accept", "decline"]) {
  test(`authenticated ${action} responses and replays are non-cacheable`, async () => {
    const value = actionTokens[action];
    for (const expected of [200, 400]) {
      const response = await fetch(
        new URL("/api/invitations/respond", origin),
        {
          method: "POST",
          headers: { cookie, origin, "content-type": "application/json" },
          body: JSON.stringify({ token: value, action }),
        },
      );
      assert.equal(response.status, expected);
      assertNoStore(response);
      const result = await response.text();
      assert.ok(!result.includes(value));
      assert.equal(JSON.parse(result).ok, expected === 200);
    }
  });
}
