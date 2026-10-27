import { auth } from "@/lib/auth";
import { authEnvironment } from "@/lib/auth-environment";
import { revokeOrganisationInvitation } from "@/lib/invitation-service";
import { OrganisationAccessError } from "@/lib/organisation-service";
import { hasTrustedRequestOrigin } from "@/lib/request-origin";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  context: {
    params: Promise<{ organisationId: string; invitationId: string }>;
  },
) {
  if (!hasTrustedRequestOrigin(request, authEnvironment.BETTER_AUTH_URL))
    return NextResponse.json(
      { ok: false, code: "invalid_origin" },
      { status: 403 },
    );
  const session = await auth.api.getSession({ headers: await headers() });
  const params = await context.params;
  try {
    const result = await revokeOrganisationInvitation(
      session?.user
        ? {
            id: session.user.id,
            email: session.user.email,
            emailVerified: session.user.emailVerified,
          }
        : null,
      params.organisationId,
      params.invitationId,
    );
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    if (error instanceof OrganisationAccessError)
      return NextResponse.json(
        { ok: false, code: error.code },
        { status: error.code === "unauthenticated" ? 401 : 403 },
      );
    return NextResponse.json(
      { ok: false, code: "request_failed" },
      { status: 500 },
    );
  }
}
