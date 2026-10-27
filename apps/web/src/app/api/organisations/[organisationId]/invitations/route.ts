import { auth } from "@/lib/auth";
import { authEnvironment } from "@/lib/auth-environment";
import { createOrganisationInvitation } from "@/lib/invitation-service";
import { OrganisationAccessError } from "@/lib/organisation-service";
import { hasTrustedRequestOrigin } from "@/lib/request-origin";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ organisationId: string }> },
) {
  if (!hasTrustedRequestOrigin(request, authEnvironment.BETTER_AUTH_URL))
    return NextResponse.json(
      { ok: false, code: "invalid_origin" },
      { status: 403 },
    );
  const session = await auth.api.getSession({ headers: await headers() });
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: "invalid_input" },
      { status: 400 },
    );
  }
  try {
    const result = await createOrganisationInvitation(
      session?.user
        ? {
            id: session.user.id,
            email: session.user.email,
            emailVerified: session.user.emailVerified,
          }
        : null,
      (await context.params).organisationId,
      input,
    );
    return NextResponse.json(result, { status: result.ok ? 201 : 400 });
  } catch (error) {
    if (error instanceof OrganisationAccessError)
      return NextResponse.json(
        { ok: false, code: error.code },
        { status: error.code === "unauthenticated" ? 401 : 403 },
      );
    return NextResponse.json(
      { ok: false, code: "delivery_failed" },
      { status: 503 },
    );
  }
}
