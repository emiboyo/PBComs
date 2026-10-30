import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  MemberRoleManagement,
  type OrganisationMember,
} from "./member-role-management";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
const members: OrganisationMember[] = [
  {
    id: "owner-membership",
    userId: "owner",
    name: "Owner",
    email: "owner@example.test",
    role: "owner",
    createdAt: new Date("2026-01-01Z"),
  },
  {
    id: "member-membership",
    userId: "member",
    name: "A very long name ".repeat(12),
    email: "member@example.test",
    role: "member",
    createdAt: new Date("2026-01-02Z"),
  },
];
describe("organisation member interface", () => {
  it("shows current role, members, accessible controls, descriptions, and final-owner protection", () => {
    const html = renderToStaticMarkup(
      <MemberRoleManagement
        organisationId="org"
        members={members}
        currentUserId="owner"
        currentRole="owner"
      />,
    );
    expect(html).toContain("Owner (you)");
    expect(html).toContain("The final owner cannot be demoted.");
    expect(html).toContain('aria-label="Save role for member@example.test"');
    expect(html).not.toContain('aria-label="Save role for owner@example.test"');
    expect(html).toContain("Role for member@example.test");
    expect(html).toContain("Manager");
    expect(html).toContain("Joined 02/01/2026");
    expect(html).toContain("no additional operational powers");
  });
  it("makes the admin roster read-only", () => {
    const html = renderToStaticMarkup(
      <MemberRoleManagement
        organisationId="org"
        members={members}
        currentUserId="admin"
        currentRole="admin"
      />,
    );
    expect(html).not.toContain("<select");
    expect(html).not.toContain("Save role");
    expect(html).toContain("Your roster access is read-only");
  });
  it("protects multiple owners without implying transfer support", () => {
    const html = renderToStaticMarkup(
      <MemberRoleManagement
        organisationId="org"
        members={[members[0]!, { ...members[1]!, role: "owner" }]}
        currentUserId="owner"
        currentRole="owner"
      />,
    );
    expect(html).not.toContain("<select");
    expect(html).toContain("ownership changes are deferred");
  });
});
