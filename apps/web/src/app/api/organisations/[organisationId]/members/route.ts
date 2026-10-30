import { getAuthenticatedUser } from "@/lib/authenticated-user";
import { listOrganisationMembers } from "@/lib/membership-service";
import { roleErrorResponse } from "@/lib/role-management-policy";

export async function GET(
  _request: Request,
  context: { params: Promise<{ organisationId: string }> },
) {
  try {
    const members = await listOrganisationMembers(
      await getAuthenticatedUser(),
      (await context.params).organisationId,
    );
    return Response.json(
      { ok: true, members },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return roleErrorResponse(error);
  }
}
