"use client";

import { authClient } from "@/lib/auth-client";
import { resetPasswordSchema } from "@/lib/auth-validation";
import { Button } from "@pbcoms/ui";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthField } from "./auth-field";

export function ResetPasswordForm({ token }: { token?: string }) {
  const [error, setError] = useState(
    token ? "" : "This reset link is invalid or expired.",
  );
  const [complete, setComplete] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = resetPasswordSchema.safeParse(values);
    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ?? "Check the password requirements.",
      );
      return;
    }
    setPending(true);
    const result = await authClient.resetPassword({
      newPassword: parsed.data.password,
      token,
    });
    setPending(false);
    if (result.error) {
      setError(
        "This reset link is invalid, expired, or has already been used.",
      );
      return;
    }
    setComplete(true);
  }

  if (complete)
    return (
      <p role="status">
        Password updated.{" "}
        <Link href="/login" className="underline">
          Sign in
        </Link>
        .
      </p>
    );

  return (
    <form onSubmit={submit} className="space-y-5">
      <AuthField
        name="password"
        label="New password"
        type="password"
        autoComplete="new-password"
        required
        disabled={!token}
      />
      <AuthField
        name="passwordConfirmation"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        required
        disabled={!token}
      />
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <Button className="w-full" disabled={pending || !token}>
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
