import { schema } from "@pbcoms/database";
import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => value || null);
export const countryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, "Use a two-letter ISO country code.");
const optionalCountry = z
  .string()
  .trim()
  .toUpperCase()
  .refine(
    (value) => value === "" || /^[A-Z]{2}$/.test(value),
    "Use a two-letter ISO country code.",
  )
  .optional()
  .nullable()
  .transform((value) => value || null);
const optionalEmail = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || z.email().safeParse(value).success,
    "Enter a valid email address.",
  )
  .max(254)
  .optional()
  .nullable()
  .transform((value) => value || null);
const optionalWebsite = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || z.url().safeParse(value).success,
    "Enter a complete website URL.",
  )
  .max(2048)
  .optional()
  .nullable()
  .transform((value) => value || null);

const { activityCodes, businessStructures } = schema;
export const activityCodeSchema = z.enum(activityCodes);
export const draftBusinessProfileSchema = z
  .object({
    tradingName: optionalText(120),
    legalName: optionalText(200),
    businessStructure: z.enum(businessStructures).optional().nullable(),
    registrationCountry: optionalCountry,
    registrationNumber: optionalText(100),
    description: optionalText(2000),
    businessEmail: optionalEmail,
    businessPhone: optionalText(50),
    website: optionalWebsite,
    operatingCountry: optionalCountry,
    addressLine1: optionalText(200),
    addressLine2: optionalText(200),
    city: optionalText(120),
    region: optionalText(120),
    postalCode: optionalText(30),
    activities: z
      .array(activityCodeSchema)
      .max(activityCodes.length)
      .optional(),
    currentStep: z.coerce.number().int().min(1).max(4).optional(),
  })
  .strict();

export const completeBusinessProfileSchema = draftBusinessProfileSchema.extend({
  tradingName: z.string().trim().min(2).max(120),
  businessStructure: z.enum(businessStructures),
  registrationCountry: countryCodeSchema,
  description: z.string().trim().min(10).max(2000),
  businessEmail: z.email().max(254),
  operatingCountry: countryCodeSchema,
  addressLine1: z.string().trim().min(2).max(200),
  city: z.string().trim().min(1).max(120),
  activities: z.array(activityCodeSchema).min(1),
});

export type DraftBusinessProfileInput = z.input<
  typeof draftBusinessProfileSchema
>;
