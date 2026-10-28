import { describe, expect, it } from "vitest";
import { organisationRoleCodes } from "@pbcoms/shared";
import {
  roleChangeSchema,
  roleErrorResponse,
  RoleManagementError,
} from "./role-management-policy";

describe("role input and safe errors", () => {
  it.each(organisationRoleCodes)("recognises stable role %s", (role) => {
    expect(roleChangeSchema.safeParse({ role }).success).toBe(true);
  });
  it.each([
    {},
    null,
    [],
    { role: "superadmin" },
    { role: "OWNER" },
    { role: "manager", actorRole: "owner" },
  ])("rejects invalid/extra role input %j", (input) => {
    expect(roleChangeSchema.safeParse(input).success).toBe(false);
  });
  it.each([
    ["unauthenticated", 401],
    ["email_unverified", 403],
    ["not_found", 404],
    ["invalid_input", 400],
    ["last_owner", 409],
    ["ownership_protected", 409],
  ] as const)("returns safe %s responses", async (code, status) => {
    const response = roleErrorResponse(new RoleManagementError(code));
    expect(response.status).toBe(status);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: false, code });
  });
  it("does not expose unexpected errors", async () => {
    const response = roleErrorResponse(
      new Error("private query and membership data"),
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      code: "request_failed",
    });
  });
});
