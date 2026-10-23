import { LogoutButton } from "@/components/logout-button";
import { auth } from "@/lib/auth";
import { Card } from "@pbcoms/ui";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?next=/app/dashboard");
  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <Card className="mx-auto mt-20 max-w-2xl bg-white">
        <p className="text-sm font-semibold text-slate-500">
          PBcoms by PearlBridge
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Welcome to PBcoms</h1>
        <p className="mt-2 text-lg">Commerce, connected.</p>
        <dl className="my-8 grid gap-2 text-sm">
          <div>
            <dt className="font-medium">Name</dt>
            <dd>{session.user.name}</dd>
          </div>
          <div>
            <dt className="font-medium">Email</dt>
            <dd>{session.user.email}</dd>
          </div>
        </dl>
        <LogoutButton />
      </Card>
    </main>
  );
}
