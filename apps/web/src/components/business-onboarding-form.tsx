"use client";

import { Button, Card, Input } from "@pbcoms/ui";
import { useState } from "react";
import { useRouter } from "next/navigation";

const steps = [
  "Business identity",
  "Commercial activities",
  "Contact and location",
  "Review and complete",
];
const structures = [
  ["company", "Limited company or corporation"],
  ["sole_trader", "Sole trader or individual business"],
  ["partnership", "Partnership"],
  ["nonprofit", "Nonprofit or charity"],
  ["other", "Other"],
] as const;
const activityOptions = [
  ["retail", "Retail"],
  ["wholesale", "Wholesale"],
  ["manufacturing", "Manufacturing"],
  ["distribution", "Distribution"],
  ["import_export", "Import and export"],
  ["logistics", "Logistics and delivery"],
  ["services", "Professional or commercial services"],
  ["procurement", "Procurement and purchasing"],
] as const;
type State = {
  tradingName: string;
  legalName: string;
  businessStructure: string;
  registrationCountry: string;
  registrationNumber: string;
  description: string;
  businessEmail: string;
  businessPhone: string;
  website: string;
  operatingCountry: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  activities: string[];
};

export function BusinessOnboardingForm({
  organisationId,
  initial,
}: {
  organisationId: string;
  initial: Record<string, unknown>;
}) {
  const router = useRouter();
  const [step, setStep] = useState(Number(initial.currentStep ?? 1));
  const [form, setForm] = useState<State>({
    tradingName: String(initial.tradingName ?? ""),
    legalName: String(initial.legalName ?? ""),
    businessStructure: String(initial.businessStructure ?? ""),
    registrationCountry: String(initial.registrationCountry ?? ""),
    registrationNumber: String(initial.registrationNumber ?? ""),
    description: String(initial.description ?? ""),
    businessEmail: String(initial.businessEmail ?? ""),
    businessPhone: String(initial.businessPhone ?? ""),
    website: String(initial.website ?? ""),
    operatingCountry: String(initial.operatingCountry ?? ""),
    addressLine1: String(initial.addressLine1 ?? ""),
    addressLine2: String(initial.addressLine2 ?? ""),
    city: String(initial.city ?? ""),
    region: String(initial.region ?? ""),
    postalCode: String(initial.postalCode ?? ""),
    activities: (initial.activities as string[] | undefined) ?? [],
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const update = (key: Exclude<keyof State, "activities">, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  async function submit(complete = false) {
    setBusy(true);
    setMessage("");
    setErrors({});
    try {
      const response = await fetch(
        `/api/organisations/${organisationId}/business-profile`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...form, currentStep: step, complete }),
        },
      );
      const result = (await response.json()) as {
        ok?: boolean;
        code?: string;
        fieldErrors?: Record<string, string[]>;
      };
      if (!response.ok || !result.ok) {
        setErrors(result.fieldErrors ?? {});
        setMessage(
          result.code === "invalid_input"
            ? "Please correct the highlighted information."
            : "We could not save your profile.",
        );
        return;
      }
      if (complete) {
        router.push(`/app/organisations/${organisationId}?onboarding=complete`);
        router.refresh();
        return;
      }
      setMessage("Draft saved.");
      if (step < 4) setStep(step + 1);
    } catch {
      setMessage("We could not save your profile. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const field = (
    name: Exclude<keyof State, "activities">,
    label: string,
    required = false,
    type = "text",
  ) => (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      {required && " *"}
      <Input
        type={type}
        value={form[name]}
        onChange={(e) => update(name, e.target.value)}
        aria-invalid={!!errors[name]}
      />
      {errors[name] && <span className="text-red-700">{errors[name][0]}</span>}
    </label>
  );
  return (
    <Card className="mx-auto max-w-3xl bg-white">
      <p className="text-sm font-semibold text-blue-700">Step {step} of 4</p>
      <h1 className="mt-2 text-3xl font-semibold">Set up your business</h1>
      <ol className="mt-6 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {steps.map((name, index) => (
          <li
            key={name}
            className={`rounded-md p-2 ${index + 1 === step ? "bg-blue-700 text-white" : "bg-slate-100"}`}
          >
            {index + 1}. {name}
          </li>
        ))}
      </ol>
      <div className="mt-8 grid gap-5">
        {step === 1 && (
          <>
            {field("tradingName", "Trading name", true)}
            {field("legalName", "Legal business name")}
            <label className="grid gap-2 text-sm font-medium">
              Business structure *
              <select
                className="rounded-md border border-slate-300 p-3"
                value={form.businessStructure}
                onChange={(e) => update("businessStructure", e.target.value)}
                aria-invalid={!!errors.businessStructure}
              >
                <option value="">Select structure</option>
                {structures.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {errors.businessStructure && (
                <span className="text-red-700">
                  {errors.businessStructure[0]}
                </span>
              )}
            </label>
            {field(
              "registrationCountry",
              "Country of registration (ISO code)",
              true,
            )}
            {field("registrationNumber", "Company registration number")}
            <label className="grid gap-2 text-sm font-medium">
              Business description *
              <textarea
                className="min-h-32 rounded-md border border-slate-300 p-3"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                aria-invalid={!!errors.description}
              />
              {errors.description && (
                <span className="text-red-700">{errors.description[0]}</span>
              )}
            </label>
          </>
        )}
        {step === 2 && (
          <fieldset>
            <legend className="font-semibold">
              What does your business do? *
            </legend>
            <p className="mt-1 text-sm text-slate-600">
              Select every activity that applies.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {activityOptions.map(([value, label]) => (
                <label key={value} className="flex gap-3 rounded-md border p-4">
                  <input
                    type="checkbox"
                    checked={form.activities.includes(value)}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        activities: e.target.checked
                          ? [...current.activities, value]
                          : current.activities.filter((item) => item !== value),
                      }))
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
            {errors.activities && (
              <p className="mt-2 text-sm text-red-700">
                {errors.activities[0]}
              </p>
            )}
          </fieldset>
        )}
        {step === 3 && (
          <div className="grid gap-5 sm:grid-cols-2">
            {field("businessEmail", "Business email", true, "email")}
            {field("businessPhone", "Business telephone")}
            {field("website", "Website", false, "url")}
            {field(
              "operatingCountry",
              "Primary operating country (ISO code)",
              true,
            )}
            {field("addressLine1", "Address line 1", true)}
            {field("addressLine2", "Address line 2")}
            {field("city", "City or locality", true)}
            {field("region", "Region or state")}
            {field("postalCode", "Postal code")}
          </div>
        )}
        {step === 4 && (
          <div>
            <h2 className="text-xl font-semibold">
              Review your business profile
            </h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              {Object.entries(form)
                .filter(([key]) => key !== "activities")
                .map(([key, value]) => (
                  <div key={key}>
                    <dt className="font-medium text-slate-500">
                      {key
                        .replace(/[A-Z]/g, (letter) => ` ${letter}`)
                        .replace(/^./, (letter) => letter.toUpperCase())}
                    </dt>
                    <dd>{value || "—"}</dd>
                  </div>
                ))}
              <div>
                <dt className="font-medium text-slate-500">Activities</dt>
                <dd>{form.activities.join(", ") || "—"}</dd>
              </div>
            </dl>
            <p className="mt-5 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
              Completing this profile does not verify or approve the business
              for regulated activities.
            </p>
          </div>
        )}
      </div>
      {message && (
        <p role="status" className="mt-5 text-sm">
          {message}
        </p>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        {step > 1 && (
          <Button
            type="button"
            onClick={() => setStep(step - 1)}
            disabled={busy}
          >
            Back
          </Button>
        )}
        <Button
          type="button"
          onClick={() => submit(step === 4)}
          disabled={busy}
        >
          {busy
            ? "Saving…"
            : step === 4
              ? "Complete onboarding"
              : "Save and continue"}
        </Button>
      </div>
    </Card>
  );
}
