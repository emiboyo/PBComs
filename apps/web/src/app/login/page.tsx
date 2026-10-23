import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" description="Sign in securely to PBcoms.">
      <Suspense fallback={<p>Loading…</p>}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
