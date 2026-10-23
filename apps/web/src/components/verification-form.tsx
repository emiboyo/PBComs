"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@pbcoms/ui";
import { useState, type FormEvent } from "react";
import { AuthField } from "./auth-field";

export function VerificationForm() {
  const [complete, setComplete] = useState(false);
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const values = new FormData(event.currentTarget);
    await authClient.sendVerificationEmail({
      email: String(values.get("email") ?? "")
        .trim()
        .toLowerCase(),
      callbackURL: "/verify-email?verified=1",
    });
    setPending(false);
    setComplete(true);
  }
  if (complete)
    return (
      <p role="status">
        If the address is eligible, a new verification link has been prepared.
      </p>
    );
  return (
    <form onSubmit={submit} className="space-y-5">
      <AuthField
        name="email"
        label="Email address"
        type="email"
        autoComplete="email"
        required
      />
      <Button className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Resend verification"}
      </Button>
    </form>
  );
}
