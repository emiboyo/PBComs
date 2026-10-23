import { headers } from "next/headers";
import { auth } from "./auth";

export async function getAuthenticatedUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user
    ? { id: session.user.id, emailVerified: session.user.emailVerified }
    : null;
}
