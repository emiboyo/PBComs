import { auth } from "@/lib/auth";
import { authEnvironment } from "@/lib/auth-environment";
import { respondToInvitation } from "@/lib/invitation-service";
import { OrganisationAccessError } from "@/lib/organisation-service";
import { hasTrustedRequestOrigin } from "@/lib/request-origin";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
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
    const result = await respondToInvitation(
      session?.user
        ? {
            id: session.user.id,
            email: session.user.email,
            emailVerified: session.user.emailVerified,
          }
        : null,
      input as { token: string; action: "accept" | "decline" },
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
