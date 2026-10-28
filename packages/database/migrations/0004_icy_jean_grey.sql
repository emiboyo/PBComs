ALTER TABLE "organisation_membership" DROP CONSTRAINT "organisation_membership_role_valid";--> statement-breakpoint
ALTER TABLE "organisation_membership" ALTER COLUMN "role" SET DEFAULT 'member';--> statement-breakpoint
ALTER TABLE "organisation_membership" ADD COLUMN "role_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organisation_membership" ADD COLUMN "role_changed_by_user_id" text;--> statement-breakpoint
ALTER TABLE "organisation_membership" ADD CONSTRAINT "organisation_membership_role_changed_by_user_id_user_id_fk" FOREIGN KEY ("role_changed_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organisation_membership" ADD CONSTRAINT "organisation_membership_role_valid" CHECK ("organisation_membership"."role" in ('owner', 'admin', 'manager', 'staff', 'viewer', 'member'));