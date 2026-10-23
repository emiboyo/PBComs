import { Card } from "@pbcoms/ui";
import { env } from "../env";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-900">
      <Card className="w-full max-w-lg bg-white">
        <h1 className="text-3xl font-semibold">{env.NEXT_PUBLIC_APP_NAME}</h1>
        <p className="mt-2 text-lg">Commerce, connected.</p>
        {env.NODE_ENV === "development" && (
          <p className="mt-6 text-sm text-slate-500">
            PBcoms platform foundation is running.
          </p>
        )}
      </Card>
    </main>
  );
}
