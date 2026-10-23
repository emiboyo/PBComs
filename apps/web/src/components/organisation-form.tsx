"use client";

import { Button, Input } from "@pbcoms/ui";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Failure = {
  ok: false;
  code: string;
  fieldErrors?: Record<string, string[]>;
};

export function OrganisationForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/organisations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          slug: data.get("slug"),
        }),
      });
      const result = (await response.json()) as
        Failure | { ok: true; organisation: { id: string } };
      if (result.ok) {
        router.push(`/app/organisations/${result.organisation.id}?created=1`);
        return;
      }
      setError(
        result.code === "slug_taken"
          ? "That organisation slug is already in use."
          : (Object.values(result.fieldErrors ?? {}).flat()[0] ??
              "We could not create the organisation."),
      );
    } catch {
      setError("We could not create the organisation. Please try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <form className="mt-8 grid gap-5" onSubmit={submit}>
      <label className="grid gap-2 text-sm font-medium">
        Organisation name
        <Input
          name="name"
          required
          minLength={2}
          maxLength={120}
          autoComplete="organization"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Preferred slug{" "}
        <span className="font-normal text-slate-500">(optional)</span>
        <Input
          name="slug"
          maxLength={63}
          placeholder="pearlbridge-trading"
          aria-describedby="slug-help"
        />
        <span id="slug-help" className="font-normal text-slate-500">
          Lowercase letters, numbers and hyphens. We generate one if left blank.
        </span>
      </label>
      {error && (
        <p
          role="alert"
          className="rounded-md bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create organisation"}
      </Button>
    </form>
  );
}
