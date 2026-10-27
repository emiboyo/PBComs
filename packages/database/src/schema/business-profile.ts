import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { organisation } from "./organisation";

export const businessStructures = [
  "company",
  "sole_trader",
  "partnership",
  "nonprofit",
  "other",
] as const;
export const onboardingStatuses = ["in_progress", "completed"] as const;
export const activityCodes = [
  "retail",
  "wholesale",
  "manufacturing",
  "distribution",
  "import_export",
  "logistics",
  "services",
  "procurement",
] as const;

export const businessProfile = pgTable(
  "business_profile",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisation.id, { onDelete: "restrict" }),
    tradingName: text("trading_name"),
    legalName: text("legal_name"),
    businessStructure: text("business_structure", { enum: businessStructures }),
    registrationCountry: text("registration_country"),
    registrationNumber: text("registration_number"),
    description: text("description"),
    businessEmail: text("business_email"),
    businessPhone: text("business_phone"),
    website: text("website"),
    operatingCountry: text("operating_country"),
    addressLine1: text("address_line_1"),
    addressLine2: text("address_line_2"),
    city: text("city"),
    region: text("region"),
    postalCode: text("postal_code"),
    onboardingStatus: text("onboarding_status", { enum: onboardingStatuses })
      .default("in_progress")
      .notNull(),
    currentStep: text("current_step").default("1").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("business_profile_organisation_unique").on(
      table.organisationId,
    ),
    check(
      "business_profile_status_valid",
      sql`${table.onboardingStatus} in ('in_progress', 'completed')`,
    ),
    check(
      "business_profile_step_valid",
      sql`${table.currentStep} in ('1', '2', '3', '4')`,
    ),
    check(
      "business_profile_structure_valid",
      sql`${table.businessStructure} is null or ${table.businessStructure} in ('company','sole_trader','partnership','nonprofit','other')`,
    ),
    check(
      "business_profile_registration_country_format",
      sql`${table.registrationCountry} is null or ${table.registrationCountry} ~ '^[A-Z]{2}$'`,
    ),
    check(
      "business_profile_operating_country_format",
      sql`${table.operatingCountry} is null or ${table.operatingCountry} ~ '^[A-Z]{2}$'`,
    ),
  ],
);

export const businessActivityType = pgTable(
  "business_activity_type",
  {
    code: text("code").primaryKey(),
    label: text("label").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "business_activity_type_code_format",
      sql`${table.code} ~ '^[a-z][a-z0-9_]{1,49}$'`,
    ),
  ],
);

export const organisationBusinessActivity = pgTable(
  "organisation_business_activity",
  {
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisation.id, { onDelete: "restrict" }),
    activityCode: text("activity_code")
      .notNull()
      .references(() => businessActivityType.code, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.organisationId, table.activityCode],
      name: "organisation_business_activity_pk",
    }),
    index("organisation_business_activity_code_idx").on(table.activityCode),
  ],
);

export const businessProfileRelations = relations(
  businessProfile,
  ({ one }) => ({
    organisation: one(organisation, {
      fields: [businessProfile.organisationId],
      references: [organisation.id],
    }),
  }),
);
export const organisationBusinessActivityRelations = relations(
  organisationBusinessActivity,
  ({ one }) => ({
    organisation: one(organisation, {
      fields: [organisationBusinessActivity.organisationId],
      references: [organisation.id],
    }),
    activity: one(businessActivityType, {
      fields: [organisationBusinessActivity.activityCode],
      references: [businessActivityType.code],
    }),
  }),
);
