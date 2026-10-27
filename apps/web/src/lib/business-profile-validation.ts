import { schema } from "@pbcoms/database";
import { z } from "zod";
import { isoCountryCodeSet } from "./iso-country-codes";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional();
export const countryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine(
    (value) => isoCountryCodeSet.has(value),
    "Use a valid ISO 3166-1 alpha-2 country code.",
  );
const optionalCountry = z
  .union([countryCodeSchema, z.literal("").transform(() => null), z.null()])
  .optional();
const optionalEmail = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || z.email().safeParse(value).success,
    "Enter a valid email address.",
  )
  .max(254)
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .optional();
const optionalWebsite = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || z.url().safeParse(value).success,
    "Enter a complete website URL.",
  )
  .max(2048)
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .optional();

const { activityCodes, businessStructures } = schema;
export const activityCodeSchema = z.enum(activityCodes);
const activitiesSchema = z
  .array(activityCodeSchema)
  .max(activityCodes.length)
  .refine(
    (activities) => new Set(activities).size === activities.length,
    "Select each business activity only once.",
  );
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
    activities: activitiesSchema.optional(),
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
  activities: activitiesSchema.min(1),
});

export type DraftBusinessProfileInput = z.input<
  typeof draftBusinessProfileSchema
>;
