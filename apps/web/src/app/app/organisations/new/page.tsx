import { OrganisationForm } from "@/components/organisation-form";
import { getAuthenticatedUser } from "@/lib/authenticated-user";
import { Card } from "@pbcoms/ui";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewOrganisationPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login?next=/app/organisations/new");
  if (!user.emailVerified) redirect("/verify-email");
  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <Card className="mx-auto mt-12 max-w-xl bg-white">
        <Link
          href="/app/dashboard"
          className="text-sm font-medium text-blue-700"
        >
          ← Dashboard
        </Link>
        <h1 className="mt-5 text-3xl font-semibold">Create an organisation</h1>
        <p className="mt-2 text-slate-600">
          Set up a separate business identity on PBcoms.
        </p>
        <OrganisationForm />
      </Card>
    </main>
  );
}
