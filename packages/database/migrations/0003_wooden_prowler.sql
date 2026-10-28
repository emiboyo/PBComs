CREATE TABLE "organisation_invitation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"email" text NOT NULL,
	"invited_by_user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"declined_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "organisation_invitation_email_normalised" CHECK ("organisation_invitation"."email" = lower(btrim("organisation_invitation"."email"))),
	CONSTRAINT "organisation_invitation_role_member" CHECK ("organisation_invitation"."role" = 'member'),
	CONSTRAINT "organisation_invitation_status_valid" CHECK ("organisation_invitation"."status" in ('pending', 'accepted', 'declined', 'revoked', 'expired')),
	CONSTRAINT "organisation_invitation_resolution_valid" CHECK (("organisation_invitation"."status" = 'pending' and "organisation_invitation"."accepted_at" is null and "organisation_invitation"."declined_at" is null and "organisation_invitation"."revoked_at" is null)
        or ("organisation_invitation"."status" = 'accepted' and "organisation_invitation"."accepted_at" is not null and "organisation_invitation"."declined_at" is null and "organisation_invitation"."revoked_at" is null)
        or ("organisation_invitation"."status" = 'declined' and "organisation_invitation"."accepted_at" is null and "organisation_invitation"."declined_at" is not null and "organisation_invitation"."revoked_at" is null)
        or ("organisation_invitation"."status" = 'revoked' and "organisation_invitation"."accepted_at" is null and "organisation_invitation"."declined_at" is null and "organisation_invitation"."revoked_at" is not null)
        or ("organisation_invitation"."status" = 'expired' and "organisation_invitation"."accepted_at" is null and "organisation_invitation"."declined_at" is null and "organisation_invitation"."revoked_at" is null)),
	CONSTRAINT "organisation_invitation_expiry_after_creation" CHECK ("organisation_invitation"."expires_at" > "organisation_invitation"."created_at")
);
--> statement-breakpoint
ALTER TABLE "organisation_membership" DROP CONSTRAINT "organisation_membership_role_valid";--> statement-breakpoint
ALTER TABLE "organisation_invitation" ADD CONSTRAINT "organisation_invitation_organisation_id_organisation_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organisation_invitation" ADD CONSTRAINT "organisation_invitation_invited_by_user_id_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organisation_invitation_token_hash_unique" ON "organisation_invitation" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "organisation_invitation_pending_email_unique" ON "organisation_invitation" USING btree ("organisation_id","email") WHERE "organisation_invitation"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "organisation_invitation_organisation_id_idx" ON "organisation_invitation" USING btree ("organisation_id");--> statement-breakpoint
CREATE INDEX "organisation_invitation_email_idx" ON "organisation_invitation" USING btree ("email");--> statement-breakpoint
CREATE INDEX "organisation_invitation_expires_at_idx" ON "organisation_invitation" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "organisation_membership" ADD CONSTRAINT "organisation_membership_role_valid" CHECK ("organisation_membership"."role" in ('owner', 'member'));