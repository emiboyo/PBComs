import { organisationRoles } from "@pbcoms/shared";
import type { OrganisationSummary } from "@/lib/organisation-service";
import Link from "next/link";
import React from "react";

export function OrganisationSwitcher({
  organisations,
  activeOrganisationId,
}: {
  organisations: OrganisationSummary[];
  activeOrganisationId?: string;
}) {
  const active = organisations.find(
    (organisation) => organisation.id === activeOrganisationId,
  );

  return (
    <nav aria-label="Organisation switcher" className="mx-auto max-w-3xl">
      <details className="group rounded-lg border border-slate-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
          <span className="min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Active organisation
            </span>
            <span className="block truncate font-semibold text-slate-950">
              {active?.name ?? "Choose an organisation"}
            </span>
          </span>
          <span aria-hidden="true" className="shrink-0 text-slate-500">
            ▾
          </span>
        </summary>
        <div className="border-t border-slate-200 p-2">
          {organisations.length === 0 ? (
            <p className="px-3 py-4 text-sm text-slate-600">
              You do not have access to any organisations yet.
            </p>
          ) : (
            <ul className="grid gap-1" aria-label="Accessible organisations">
              {organisations.map((organisation) => {
                const isActive = organisation.id === activeOrganisationId;
                const isSelectable = organisation.status === "active";
                const label = organisation.tradingName ?? organisation.name;
                return (
                  <li key={organisation.id}>
                    {isSelectable ? (
                      <Link
                        href={`/app/organisations/${organisation.id}`}
                        aria-current={isActive ? "page" : undefined}
                        className={`block min-w-0 rounded-md px-3 py-3 outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                          isActive
                            ? "bg-blue-50 text-blue-950"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <span className="block truncate font-medium">
                          {label}
                        </span>
                        {organisation.tradingName && (
                          <span className="block truncate text-xs text-slate-500">
                            {organisation.name}
                          </span>
                        )}
                        <span className="block text-xs text-slate-600">
                          {organisationRoles[organisation.role].label}
                        </span>
                        {isActive && (
                          <span className="text-xs font-medium text-blue-700">
                            Current organisation
                          </span>
                        )}
                      </Link>
                    ) : (
                      <div
                        aria-disabled="true"
                        className="min-w-0 rounded-md px-3 py-3 text-slate-500"
                      >
                        <span className="block truncate font-medium">
                          {label}
                        </span>
                        <span className="block text-xs capitalize">
                          {organisation.status} — unavailable
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <Link
            href="/app/organisations/new"
            className="mt-2 block rounded-md border-t border-slate-200 px-3 py-3 font-medium text-blue-700 outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            Create a new organisation
          </Link>
        </div>
      </details>
    </nav>
  );
}
