import { AuthShell } from "@/components/auth-shell";
import { VerificationForm } from "@/components/verification-form";
import Link from "next/link";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string; error?: string }>;
}) {
  const parameters = await searchParams;
  const message = parameters.verified
    ? "Your email is verified. You can now sign in."
    : parameters.error
      ? "This verification link is invalid or expired. Request a new one below."
      : "Use the verification link in your email preview or inbox.";
  return (
    <AuthShell title="Verify your email" description={message}>
      {parameters.verified && (
        <p className="mb-6">
          <Link className="underline" href="/login">
            Continue to sign in
          </Link>
        </p>
      )}
      <VerificationForm />
    </AuthShell>
  );
}
