CREATE TABLE "business_activity_type" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_activity_type_code_format" CHECK ("business_activity_type"."code" ~ '^[a-z][a-z0-9_]{1,49}$')
);
--> statement-breakpoint
CREATE TABLE "business_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"trading_name" text,
	"legal_name" text,
	"business_structure" text,
	"registration_country" text,
	"registration_number" text,
	"description" text,
	"business_email" text,
	"business_phone" text,
	"website" text,
	"operating_country" text,
	"address_line_1" text,
	"address_line_2" text,
	"city" text,
	"region" text,
	"postal_code" text,
	"onboarding_status" text DEFAULT 'in_progress' NOT NULL,
	"current_step" text DEFAULT '1' NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_profile_status_valid" CHECK ("business_profile"."onboarding_status" in ('in_progress', 'completed')),
	CONSTRAINT "business_profile_step_valid" CHECK ("business_profile"."current_step" in ('1', '2', '3', '4')),
	CONSTRAINT "business_profile_structure_valid" CHECK ("business_profile"."business_structure" is null or "business_profile"."business_structure" in ('company','sole_trader','partnership','nonprofit','other')),
	CONSTRAINT "business_profile_registration_country_format" CHECK ("business_profile"."registration_country" is null or "business_profile"."registration_country" ~ '^[A-Z]{2}$'),
	CONSTRAINT "business_profile_operating_country_format" CHECK ("business_profile"."operating_country" is null or "business_profile"."operating_country" ~ '^[A-Z]{2}$')
);
--> statement-breakpoint
CREATE TABLE "organisation_business_activity" (
	"organisation_id" uuid NOT NULL,
	"activity_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organisation_business_activity_pk" PRIMARY KEY("organisation_id","activity_code")
);
--> statement-breakpoint
ALTER TABLE "business_profile" ADD CONSTRAINT "business_profile_organisation_id_organisation_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organisation_business_activity" ADD CONSTRAINT "organisation_business_activity_organisation_id_organisation_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organisation_business_activity" ADD CONSTRAINT "organisation_business_activity_activity_code_business_activity_type_code_fk" FOREIGN KEY ("activity_code") REFERENCES "public"."business_activity_type"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "business_profile_organisation_unique" ON "business_profile" USING btree ("organisation_id");--> statement-breakpoint
CREATE INDEX "organisation_business_activity_code_idx" ON "organisation_business_activity" USING btree ("activity_code");
--> statement-breakpoint
INSERT INTO "business_activity_type" ("code", "label") VALUES
  ('retail', 'Retail'),
  ('wholesale', 'Wholesale'),
  ('manufacturing', 'Manufacturing'),
  ('distribution', 'Distribution'),
  ('import_export', 'Import and export'),
  ('logistics', 'Logistics and delivery'),
  ('services', 'Professional or commercial services'),
  ('procurement', 'Procurement and purchasing');
