import { InvitationManagement } from "@/components/invitation-management";
import { OrganisationSwitcher } from "@/components/organisation-switcher";
import { getAuthenticatedUser } from "@/lib/authenticated-user";
import { getOrganisationInvitations } from "@/lib/invitation-service";
import {
  getOrganisationsForUser,
  OrganisationAccessError,
  requireOrganisationOwner,
} from "@/lib/organisation-service";
import { Card } from "@pbcoms/ui";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function InvitationsPage({
  params,
}: {
  params: Promise<{ organisationId: string }>;
}) {
  const user = await getAuthenticatedUser();
  const organisationId = (await params).organisationId;
  if (!user)
    redirect(
      `/login?next=${encodeURIComponent(`/app/organisations/${organisationId}/invitations`)}`,
    );
  try {
    const organisation = await requireOrganisationOwner(user, organisationId);
    const [organisations, invitations] = await Promise.all([
      getOrganisationsForUser(user),
      getOrganisationInvitations(user, organisationId),
    ]);
    return (
      <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
        <OrganisationSwitcher
          organisations={organisations}
          activeOrganisationId={organisation.id}
        />
        <Card className="mx-auto mt-8 max-w-3xl bg-white">
          <Link
            href={`/app/organisations/${organisation.id}`}
            className="text-sm font-medium text-blue-700"
          >
            ← {organisation.name}
          </Link>
          <h1 className="mt-5 text-3xl font-semibold">Member invitations</h1>
          <p className="mt-2 text-sm text-slate-600">
            Invite a person as a member. Members receive read-only organisation
            access and cannot manage invitations or business onboarding.
          </p>
          <InvitationManagement
            organisationId={organisation.id}
            invitations={invitations}
          />
        </Card>
      </main>
    );
  } catch (error) {
    if (error instanceof OrganisationAccessError) notFound();
    throw error;
  }
}
