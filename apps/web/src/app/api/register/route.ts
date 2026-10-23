import { auth } from "@/lib/auth";
import { authEnvironment } from "@/lib/auth-environment";
import { registrationSchema } from "@/lib/auth-validation";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const result = registrationSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!result.success) {
    return NextResponse.json(
      {
        error: "Please correct the highlighted registration details.",
        issues: result.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const authRequest = new Request(
    authEnvironment.BETTER_AUTH_URL + "/api/auth/sign-up/email",
    {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify({
        name: result.data.name,
        email: result.data.email,
        password: result.data.password,
        callbackURL: "/verify-email?verified=1",
      }),
    },
  );
  authRequest.headers.set("content-type", "application/json");
  const response = await auth.handler(authRequest);
  if (!response.ok && response.status !== 422) return response;

  return NextResponse.json(
    {
      message:
        "If the address can be registered, a verification email has been prepared.",
    },
    { status: 202 },
  );
}
