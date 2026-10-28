import { canViewOrganisationRoster } from "@pbcoms/shared";
import { getAuthenticatedUser } from "@/lib/authenticated-user";
import {
  OrganisationAccessError,
  requireOrganisationMembership,
} from "@/lib/organisation-service";
import { Card } from "@pbcoms/ui";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getBusinessProfile } from "@/lib/business-profile-service";
import { Button } from "@pbcoms/ui";
import { OrganisationSwitcher } from "@/components/organisation-switcher";
import { getOrganisationsForUser } from "@/lib/organisation-service";

export default async function OrganisationPage({
  params,
  searchParams,
}: {
  params: Promise<{ organisationId: string }>;
  searchParams: Promise<{ created?: string; onboarding?: string }>;
}) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  try {
    const organisation = await requireOrganisationMembership(
      user,
      (await params).organisationId,
    );
    const business = await getBusinessProfile(user, organisation.id);
    const organisations = await getOrganisationsForUser(user);
    const onboardingComplete = business.status === "completed";
    return (
      <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
        <OrganisationSwitcher
          organisations={organisations}
          activeOrganisationId={organisation.id}
        />
        <Card className="mx-auto mt-12 max-w-2xl bg-white">
          <Link
            href="/app/dashboard"
            className="text-sm font-medium text-blue-700"
          >
            ← Dashboard
          </Link>
          {(await searchParams).created === "1" && (
            <p
              role="status"
              className="mt-5 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800"
            >
              Organisation created successfully.
            </p>
          )}
          {(await searchParams).onboarding === "complete" && (
            <p
              role="status"
              className="mt-5 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800"
            >
              Business onboarding completed successfully.
            </p>
          )}
          <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Organisation
          </p>
          <h1 className="mt-2 text-3xl font-semibold">{organisation.name}</h1>
          <dl className="mt-8 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-slate-500">Slug</dt>
              <dd>{organisation.slug}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Status</dt>
              <dd className="capitalize">{organisation.status}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Your membership</dt>
              <dd className="capitalize">{organisation.role}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Created</dt>
              <dd>{organisation.createdAt.toLocaleDateString("en-GB")}</dd>
            </div>
          </dl>
          <div className="mt-8 rounded-lg border border-slate-200 p-5">
            <p className="text-sm font-medium text-slate-500">
              Business onboarding
            </p>
            <p className="mt-1 text-lg font-semibold capitalize">
              {business.status.replace("_", " ")}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Profile completion is separate from business verification.
            </p>
            {organisation.role === "owner" ? (
              <Link
                className="mt-4 inline-block"
                href={`/app/organisations/${organisation.id}/onboarding`}
              >
                <Button>
                  {onboardingComplete
                    ? "View or edit business profile"
                    : business.status === "not_started"
                      ? "Start onboarding"
                      : "Continue onboarding"}
                </Button>
              </Link>
            ) : (
              <p className="mt-4 text-sm text-slate-600">
                Business onboarding can be changed only by an owner.
              </p>
            )}
          </div>
          {canViewOrganisationRoster(organisation.role) && (
            <Link
              className="mt-6 mr-6 inline-block font-medium text-blue-700"
              href={`/app/organisations/${organisation.id}/members`}
            >
              View organisation members
            </Link>
          )}
          {organisation.role === "owner" && (
            <Link
              className="mt-6 inline-block font-medium text-blue-700"
              href={`/app/organisations/${organisation.id}/invitations`}
            >
              Manage member invitations
            </Link>
          )}
        </Card>
      </main>
    );
  } catch (error) {
    if (error instanceof OrganisationAccessError) notFound();
    throw error;
  }
}
