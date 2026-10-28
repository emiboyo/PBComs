import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it } from "vitest";
import { OrganisationSwitcher } from "./organisation-switcher";
import type { OrganisationSummary } from "@/lib/organisation-service";

const organisations: OrganisationSummary[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "A very long registered organisation name that must not overflow",
    tradingName: "First Trading",
    slug: "first",
    status: "active",
    role: "owner",
    createdAt: new Date("2026-01-01T00:00:00Z"),
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Archived Company",
    tradingName: null,
    slug: "archived",
    status: "archived",
    role: "owner",
    createdAt: new Date("2026-01-02T00:00:00Z"),
  },
];

describe("OrganisationSwitcher", () => {
  it("identifies the current organisation and exposes accessible choices", () => {
    const html = renderToStaticMarkup(
      <OrganisationSwitcher
        organisations={organisations}
        activeOrganisationId={organisations[0]!.id}
      />,
    );
    expect(html).toContain('aria-label="Organisation switcher"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("First Trading");
    expect(html).toContain("truncate");
  });

  it("renders inactive organisations as unavailable, not as links", () => {
    const html = renderToStaticMarkup(
      <OrganisationSwitcher organisations={organisations} />,
    );
    expect(html).toContain("Archived Company");
    expect(html).toContain("archived — unavailable");
    expect(html).not.toContain(`/app/organisations/${organisations[1]!.id}`);
  });

  it("renders an accessible empty state and creation path", () => {
    const html = renderToStaticMarkup(
      <OrganisationSwitcher organisations={[]} />,
    );
    expect(html).toContain("You do not have access to any organisations yet.");
    expect(html).toContain("/app/organisations/new");
  });
});

it("shows each organisation's own role without carrying the active role across tenants", () => {
  const html = renderToStaticMarkup(
    <OrganisationSwitcher
      organisations={[
        {
          id: "a",
          name: "Owner company",
          slug: "a",
          status: "active",
          role: "owner",
          tradingName: null,
          createdAt: new Date(),
        },
        {
          id: "b",
          name: "Manager company",
          slug: "b",
          status: "active",
          role: "manager",
          tradingName: null,
          createdAt: new Date(),
        },
        {
          id: "c",
          name: "Viewer company",
          slug: "c",
          status: "active",
          role: "viewer",
          tradingName: null,
          createdAt: new Date(),
        },
      ]}
      activeOrganisationId="a"
    />,
  );
  expect(html).toMatch(/Owner company[\s\S]*Owner/);
  expect(html).toMatch(/Manager company[\s\S]*Manager/);
  expect(html).toMatch(/Viewer company[\s\S]*Viewer/);
});
