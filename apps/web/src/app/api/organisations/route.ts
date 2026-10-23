import { auth } from "@/lib/auth";
import { authEnvironment } from "@/lib/auth-environment";
import {
  createOrganisation,
  OrganisationAccessError,
} from "@/lib/organisation-service";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { hasTrustedRequestOrigin } from "@/lib/request-origin";

export async function POST(request: Request) {
  if (!hasTrustedRequestOrigin(request, authEnvironment.BETTER_AUTH_URL)) {
    return NextResponse.json(
      { ok: false, code: "invalid_origin" },
      { status: 403 },
    );
  }
  const session = await auth.api.getSession({ headers: await headers() });
  const actor = session?.user
    ? { id: session.user.id, emailVerified: session.user.emailVerified }
    : null;
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
    const result = await createOrganisation(
      actor,
      input as { name: string; slug?: string },
    );
    return NextResponse.json(result, {
      status: result.ok ? 201 : result.code === "slug_taken" ? 409 : 400,
    });
  } catch (error) {
    if (error instanceof OrganisationAccessError) {
      return NextResponse.json(
        { ok: false, code: error.code },
        { status: error.code === "unauthenticated" ? 401 : 403 },
      );
    }
    return NextResponse.json(
      { ok: false, code: "creation_failed" },
      { status: 500 },
    );
  }
}
