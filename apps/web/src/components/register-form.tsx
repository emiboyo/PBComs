"use client";

import { registrationSchema } from "@/lib/auth-validation";
import { Button } from "@pbcoms/ui";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthField } from "./auth-field";

export function RegisterForm() {
  const [error, setError] = useState("");
  const [issues, setIssues] = useState<Record<string, string[] | undefined>>(
    {},
  );
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = registrationSchema.safeParse(values);
    if (!parsed.success) {
      setIssues(parsed.error.flatten().fieldErrors);
      return;
    }
    setPending(true);
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    setPending(false);
    if (!response.ok) {
      setError(
        "Unable to create an account. Check your details and try again.",
      );
      return;
    }
    setComplete(true);
  }

  if (complete)
    return (
      <p role="status">
        Check your email preview or inbox for a verification link.
      </p>
    );

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <AuthField
        name="name"
        label="Full name"
        autoComplete="name"
        required
        error={issues.name?.[0]}
      />
      <AuthField
        name="email"
        label="Email address"
        type="email"
        autoComplete="email"
        required
        error={issues.email?.[0]}
      />
      <AuthField
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        required
        error={issues.password?.[0]}
      />
      <AuthField
        name="passwordConfirmation"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        required
        error={issues.passwordConfirmation?.[0]}
      />
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <Button className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-center text-sm text-slate-600">
        Already registered?{" "}
        <Link className="font-medium text-slate-950 underline" href="/login">
          Sign in
        </Link>
      </p>
    </form>
  );
}
