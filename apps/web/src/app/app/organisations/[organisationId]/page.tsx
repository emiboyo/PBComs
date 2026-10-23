import { getAuthenticatedUser } from "@/lib/authenticated-user";
import {
  OrganisationAccessError,
  requireOrganisationMembership,
} from "@/lib/organisation-service";
import { Card } from "@pbcoms/ui";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function OrganisationPage({
  params,
  searchParams,
}: {
  params: Promise<{ organisationId: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  try {
    const organisation = await requireOrganisationMembership(
      user,
      (await params).organisationId,
    );
    return (
      <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
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
        </Card>
      </main>
    );
  } catch (error) {
    if (error instanceof OrganisationAccessError) notFound();
    throw error;
  }
}
