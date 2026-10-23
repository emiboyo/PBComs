import { z } from "zod";

export const reservedOrganisationSlugs = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "login",
  "register",
  "support",
  "system",
]);

export function normaliseOrganisationSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63)
    .replace(/-+$/g, "");
}

export const organisationNameSchema = z
  .string()
  .trim()
  .min(2, "Organisation name must be at least 2 characters.")
  .max(120, "Organisation name must be at most 120 characters.");

export const organisationSlugSchema = z
  .string()
  .trim()
  .min(2, "Slug must be at least 2 characters.")
  .max(63, "Slug must be at most 63 characters.")
  .regex(
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
    "Use lowercase letters, numbers, and single hyphens.",
  )
  .refine(
    (slug) => !reservedOrganisationSlugs.has(slug),
    "This slug is reserved by PBcoms.",
  );

export const createOrganisationInputSchema = z.object({
  name: organisationNameSchema,
  slug: z.string().trim().optional(),
});

export type CreateOrganisationInput = z.input<
  typeof createOrganisationInputSchema
>;
