import { getAuthenticatedUser } from "@/lib/authenticated-user";
import { authEnvironment } from "@/lib/auth-environment";
import { assignOrganisationRole } from "@/lib/membership-service";
import { hasTrustedRequestOrigin } from "@/lib/request-origin";
import {
  roleErrorResponse,
  RoleManagementError,
} from "@/lib/role-management-policy";

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ organisationId: string; membershipId: string }>;
  },
) {
  if (!hasTrustedRequestOrigin(request, authEnvironment.BETTER_AUTH_URL))
    return Response.json(
      { ok: false, code: "invalid_origin" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  try {
    const user = await getAuthenticatedUser();
    // Authenticate before processing input. The service rechecks authority in its transaction.
    if (!user) throw new RoleManagementError("unauthenticated");
    let input: unknown;
    try {
      input = await request.json();
    } catch {
      throw new RoleManagementError("invalid_input");
    }
    const { organisationId, membershipId } = await context.params;
    const membership = await assignOrganisationRole(
      user,
      organisationId,
      membershipId,
      input,
    );
    return Response.json(
      { ok: true, membership },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return roleErrorResponse(error);
  }
}
