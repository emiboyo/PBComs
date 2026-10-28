import { InvitationResponse } from "@/components/invitation-response";
import { getAuthenticatedUser } from "@/lib/authenticated-user";
import { Card } from "@pbcoms/ui";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
// Also update the document policy on App Router client navigation.
export const metadata: Metadata = { referrer: "no-referrer" };

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const token = (await params).token;
  const user = await getAuthenticatedUser();
  if (!user)
    redirect(`/login?next=${encodeURIComponent(`/app/invitations/${token}`)}`);
  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <Card className="mx-auto mt-20 max-w-xl bg-white">
        <p className="text-sm font-semibold text-blue-700">PBcoms invitation</p>
        <h1 className="mt-3 text-3xl font-semibold">Join an organisation</h1>
        <p className="mt-3 text-slate-600">
          Accept only if this invitation was intended for your verified email
          address. Possessing this link alone does not grant access.
        </p>
        <InvitationResponse token={token} />
      </Card>
    </main>
  );
}
