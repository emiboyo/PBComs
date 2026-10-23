CREATE TABLE "organisation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organisation_name_not_blank" CHECK (length(btrim("organisation"."name")) > 0),
	CONSTRAINT "organisation_name_length" CHECK (char_length("organisation"."name") <= 120),
	CONSTRAINT "organisation_slug_format" CHECK ("organisation"."slug" ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$'),
	CONSTRAINT "organisation_status_valid" CHECK ("organisation"."status" in ('active', 'suspended', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "organisation_membership" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organisation_membership_role_valid" CHECK ("organisation_membership"."role" = 'owner')
);
--> statement-breakpoint
ALTER TABLE "organisation" ADD CONSTRAINT "organisation_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organisation_membership" ADD CONSTRAINT "organisation_membership_organisation_id_organisation_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organisation_membership" ADD CONSTRAINT "organisation_membership_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organisation_slug_unique" ON "organisation" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "organisation_created_by_user_id_idx" ON "organisation" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organisation_membership_organisation_user_unique" ON "organisation_membership" USING btree ("organisation_id","user_id");--> statement-breakpoint
CREATE INDEX "organisation_membership_user_id_idx" ON "organisation_membership" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "organisation_membership_organisation_id_idx" ON "organisation_membership" USING btree ("organisation_id");