"use client";

import { Button } from "@pbcoms/ui";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

export function InvitationResponse({ token }: { token: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function respond(action: "accept" | "decline") {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/invitations/respond", {
        method: "POST",
        referrerPolicy: "no-referrer",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, action }),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        code?: string;
        organisationId?: string;
      };
      if (!response.ok || !result.ok) {
        setMessage(
          result.code === "email_mismatch"
            ? "Sign in with the verified email address that was invited."
            : "This invitation is invalid, expired, or no longer pending.",
        );
        return;
      }
      if (action === "accept" && result.organisationId) {
        router.replace(`/app/organisations/${result.organisationId}`);
        router.refresh();
      } else {
        setMessage("Invitation declined.");
      }
    } catch {
      setMessage("The invitation could not be processed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <Button onClick={() => respond("accept")} disabled={busy}>
        Accept invitation
      </Button>
      <Button onClick={() => respond("decline")} disabled={busy}>
        Decline
      </Button>
      {message && (
        <p role="status" className="w-full text-sm">
          {message}
        </p>
      )}
    </div>
  );
}
