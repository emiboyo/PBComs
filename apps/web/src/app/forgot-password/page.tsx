import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      description="Enter your email address. The response is the same whether or not an account exists."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
