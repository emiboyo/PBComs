import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";
import type { Metadata } from "next";
import { Suspense } from "react";

// A sign-in redirect can contain a sensitive invitation URL.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { referrer: "no-referrer" };

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" description="Sign in securely to PBcoms.">
      <Suspense fallback={<p>Loading…</p>}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
