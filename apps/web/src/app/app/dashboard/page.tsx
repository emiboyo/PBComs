import { LogoutButton } from "@/components/logout-button";
import { auth } from "@/lib/auth";
import { Card } from "@pbcoms/ui";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrganisationsForUser } from "@/lib/organisation-service";
import { OrganisationSwitcher } from "@/components/organisation-switcher";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?next=/app/dashboard");
  const organisations = await getOrganisationsForUser({
    id: session.user.id,
    emailVerified: session.user.emailVerified,
  });
  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <OrganisationSwitcher organisations={organisations} />
      <Card className="mx-auto mt-20 max-w-2xl bg-white">
        <p className="text-sm font-semibold text-slate-500">
          PBcoms by PearlBridge
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Welcome to PBcoms</h1>
        <p className="mt-2 text-lg">Commerce, connected.</p>
        <dl className="my-8 grid gap-2 text-sm">
          <div>
            <dt className="font-medium">Name</dt>
            <dd>{session.user.name}</dd>
          </div>
          <div>
            <dt className="font-medium">Email</dt>
            <dd>{session.user.email}</dd>
          </div>
        </dl>
        <div className="mb-8 border-t border-slate-200 pt-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Your organisations</h2>
            <Link
              className="font-medium text-blue-700"
              href="/app/organisations/new"
            >
              Create organisation
            </Link>
          </div>
          {organisations.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">
              You have not created an organisation yet.
            </p>
          ) : (
            <ul className="mt-4 grid gap-2">
              {organisations.map((organisation) => (
                <li key={organisation.id}>
                  {organisation.status === "active" ? (
                    <Link
                      className="block rounded-md border border-slate-200 p-3 hover:bg-slate-50"
                      href={`/app/organisations/${organisation.id}`}
                    >
                      <span className="font-medium">
                        {organisation.tradingName ?? organisation.name}
                      </span>
                      <span className="ml-2 text-sm text-slate-500">
                        {organisation.slug}
                      </span>
                    </Link>
                  ) : (
                    <div className="rounded-md border border-slate-200 p-3 text-slate-500">
                      <span className="font-medium">{organisation.name}</span>
                      <span className="ml-2 text-sm text-slate-500">
                        {organisation.status} — unavailable
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <LogoutButton />
      </Card>
    </main>
  );
}
