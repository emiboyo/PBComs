import { auth } from "@/lib/auth";
import { authEnvironment } from "@/lib/auth-environment";
import {
  completeBusinessOnboarding,
  getBusinessProfile,
  saveBusinessProfileDraft,
} from "@/lib/business-profile-service";
import { OrganisationAccessError } from "@/lib/organisation-service";
import { hasTrustedRequestOrigin } from "@/lib/request-origin";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const actor = async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user
    ? { id: session.user.id, emailVerified: session.user.emailVerified }
    : null;
};
const accessFailure = (error: unknown) =>
  error instanceof OrganisationAccessError
    ? NextResponse.json(
        { ok: false, code: error.code },
        {
          status:
            error.code === "unauthenticated"
              ? 401
              : error.code === "not_found"
                ? 404
                : 403,
        },
      )
    : NextResponse.json({ ok: false, code: "request_failed" }, { status: 500 });

export async function GET(
  _request: Request,
  context: { params: Promise<{ organisationId: string }> },
) {
  try {
    return NextResponse.json({
      ok: true,
      ...(await getBusinessProfile(
        await actor(),
        (await context.params).organisationId,
      )),
    });
  } catch (error) {
    return accessFailure(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ organisationId: string }> },
) {
  if (!hasTrustedRequestOrigin(request, authEnvironment.BETTER_AUTH_URL))
    return NextResponse.json(
      { ok: false, code: "invalid_origin" },
      { status: 403 },
    );
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: "invalid_input" },
      { status: 400 },
    );
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return NextResponse.json(
      { ok: false, code: "invalid_input" },
      { status: 400 },
    );
  const { complete, ...input } = body as Record<string, unknown>;
  try {
    const result =
      complete === true
        ? await completeBusinessOnboarding(
            await actor(),
            (await context.params).organisationId,
            input,
          )
        : await saveBusinessProfileDraft(
            await actor(),
            (await context.params).organisationId,
            input,
          );
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    return accessFailure(error);
  }
}
