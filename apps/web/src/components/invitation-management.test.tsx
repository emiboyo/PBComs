import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { InvitationManagement } from "./invitation-management";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("InvitationManagement", () => {
  it("renders an accessible form, history, statuses, and pending revoke action", () => {
    const html = renderToStaticMarkup(
      <InvitationManagement
        organisationId="11111111-1111-4111-8111-111111111111"
        invitations={[
          {
            id: "22222222-2222-4222-8222-222222222222",
            email: "member@example.com",
            status: "pending",
            createdAt: new Date("2026-01-01T00:00:00Z"),
            expiresAt: new Date("2026-01-08T00:00:00Z"),
          },
        ]}
      />,
    );
    expect(html).toContain('type="email"');
    expect(html).toContain("member@example.com");
    expect(html).toContain(
      'aria-label="Revoke invitation for member@example.com"',
    );
    expect(html).not.toContain("token");
  });

  it("renders the empty state", () => {
    const html = renderToStaticMarkup(
      <InvitationManagement organisationId="organisation" invitations={[]} />,
    );
    expect(html).toContain("No invitations yet.");
  });
});
