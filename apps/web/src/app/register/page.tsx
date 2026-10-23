import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "@/components/register-form";

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      description="Start with a secure PBcoms identity. Organisation access is added separately."
    >
      <RegisterForm />
    </AuthShell>
  );
}
