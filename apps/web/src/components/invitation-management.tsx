"use client";

import { Button, Input } from "@pbcoms/ui";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

type Invitation = {
  id: string;
  email: string;
  status: string;
  createdAt: Date;
  expiresAt: Date;
};

export function InvitationManagement({
  organisationId,
  invitations,
}: {
  organisationId: string;
  invitations: Invitation[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function invite() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/organisations/${organisationId}/invitations`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email }),
        },
      );
      const result = (await response.json()) as { ok?: boolean; code?: string };
      if (!response.ok || !result.ok) {
        setMessage(
          result.code === "duplicate_pending"
            ? "A pending invitation already exists for this email."
            : result.code === "already_member"
              ? "This person is already a member."
              : "The invitation could not be created.",
        );
        return;
      }
      setEmail("");
      setMessage("Invitation created and queued for delivery.");
      router.refresh();
    } catch {
      setMessage("The invitation could not be created. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(invitationId: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/organisations/${organisationId}/invitations/${invitationId}`,
        { method: "DELETE" },
      );
      const result = (await response.json()) as { ok?: boolean };
      setMessage(
        response.ok && result.ok
          ? "Invitation revoked."
          : "The invitation could not be revoked.",
      );
      if (response.ok && result.ok) router.refresh();
    } catch {
      setMessage("The invitation could not be revoked. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="grid gap-2 text-sm font-medium">
          Invitee email
          <Input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <Button
          className="self-end"
          onClick={invite}
          disabled={busy || !email.trim()}
        >
          {busy ? "Working…" : "Send invitation"}
        </Button>
      </div>
      {message && (
        <p role="status" className="mt-3 text-sm">
          {message}
        </p>
      )}
      <h2 className="mt-10 text-xl font-semibold">Invitation history</h2>
      {invitations.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">No invitations yet.</p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {invitations.map((invitation) => (
            <li
              key={invitation.id}
              className="rounded-md border border-slate-200 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{invitation.email}</p>
                  <p className="text-sm capitalize text-slate-600">
                    {invitation.status}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Invited{" "}
                    {new Date(invitation.createdAt).toLocaleDateString("en-GB")}{" "}
                    · Expires{" "}
                    {new Date(invitation.expiresAt).toLocaleDateString("en-GB")}
                  </p>
                </div>
                {invitation.status === "pending" && (
                  <Button
                    onClick={() => revoke(invitation.id)}
                    disabled={busy}
                    aria-label={`Revoke invitation for ${invitation.email}`}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
