import { MemberRoleManagement } from "@/components/member-role-management";
import { getAuthenticatedUser } from "@/lib/authenticated-user";
import { listOrganisationMembers } from "@/lib/membership-service";
import { requireOrganisationMembership } from "@/lib/organisation-service";
import { RoleManagementError } from "@/lib/role-management-policy";
import { OrganisationAccessError } from "@/lib/organisation-service";
import { Card } from "@pbcoms/ui";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export default async function MembersPage({
  params,
}: {
  params: Promise<{ organisationId: string }>;
}) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  try {
    const organisationId = (await params).organisationId;
    const members = await listOrganisationMembers(user, organisationId);
    const organisation = await requireOrganisationMembership(
      user,
      organisationId,
    );
    return (
      <main className="min-h-screen bg-slate-50 p-4 text-slate-950 sm:p-6">
        <Card className="mx-auto my-12 max-w-3xl bg-white">
          <Link
            className="text-sm font-medium text-blue-700"
            href={`/app/organisations/${organisationId}`}
          >
            ← Organisation
          </Link>
          <h1 className="mt-5 break-words text-3xl font-semibold">
            {organisation.name} members
          </h1>
          <MemberRoleManagement
            organisationId={organisationId}
            members={members}
            currentUserId={user.id}
            currentRole={organisation.role}
          />
        </Card>
      </main>
    );
  } catch (error) {
    if (
      error instanceof RoleManagementError ||
      error instanceof OrganisationAccessError
    )
      notFound();
    throw error;
  }
}
