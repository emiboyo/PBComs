import { getAuthenticatedUser } from "@/lib/authenticated-user";
import { getBusinessProfile } from "@/lib/business-profile-service";
import { BusinessOnboardingForm } from "@/components/business-onboarding-form";
import { OrganisationAccessError } from "@/lib/organisation-service";
import { notFound, redirect } from "next/navigation";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ organisationId: string }>;
}) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  try {
    const { organisation, profile, activities } = await getBusinessProfile(
      user,
      (await params).organisationId,
    );
    const initial = {
      ...(profile ?? { tradingName: organisation.name, currentStep: "1" }),
      activities: activities.map((activity) => activity.code),
    };
    return (
      <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
        <BusinessOnboardingForm
          organisationId={organisation.id}
          initial={initial}
        />
      </main>
    );
  } catch (error) {
    if (error instanceof OrganisationAccessError) notFound();
    throw error;
  }
}
