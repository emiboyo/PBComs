"use client";

import { authClient } from "@/lib/auth-client";
import { safeRedirect } from "@/lib/auth-validation";
import { Button } from "@pbcoms/ui";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthField } from "./auth-field";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const values = new FormData(event.currentTarget);
    const result = await authClient.signIn.email({
      email: String(values.get("email") ?? "")
        .trim()
        .toLowerCase(),
      password: String(values.get("password") ?? ""),
      rememberMe: true,
    });
    setPending(false);
    if (result.error) {
      setError(
        result.error.status === 403
          ? "Verify your email before signing in."
          : "The email or password is incorrect.",
      );
      return;
    }
    router.replace(safeRedirect(searchParams.get("next")));
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <AuthField
        name="email"
        label="Email address"
        type="email"
        autoComplete="email"
        required
      />
      <AuthField
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        required
      />
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <Button className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <div className="flex justify-between text-sm">
        <Link className="underline" href="/forgot-password">
          Forgot password?
        </Link>
        <Link className="underline" href="/register">
          Create account
        </Link>
      </div>
    </form>
  );
}
