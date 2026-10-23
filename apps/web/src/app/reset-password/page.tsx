import { AuthShell } from "@/components/auth-shell";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const parameters = await searchParams;
  return (
    <AuthShell
      title="Choose a new password"
      description="Reset links expire after one hour and can be used once."
    >
      <ResetPasswordForm
        token={parameters.error ? undefined : parameters.token}
      />
    </AuthShell>
  );
}
