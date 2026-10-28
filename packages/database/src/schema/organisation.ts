import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const organisationStatuses = [
  "active",
  "suspended",
  "archived",
] as const;
export const membershipRoles = ["owner", "member"] as const;
export const organisationRoles = membershipRoles;
export const invitationStatuses = [
  "pending",
  "accepted",
  "declined",
  "revoked",
  "expired",
] as const;

export const organisation = pgTable(
  "organisation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: text("status", { enum: organisationStatuses })
      .default("active")
      .notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("organisation_slug_unique").on(table.slug),
    index("organisation_created_by_user_id_idx").on(table.createdByUserId),
    check("organisation_name_not_blank", sql`length(btrim(${table.name})) > 0`),
    check("organisation_name_length", sql`char_length(${table.name}) <= 120`),
    check(
      "organisation_slug_format",
      sql`${table.slug} ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$'`,
    ),
    check(
      "organisation_status_valid",
      sql`${table.status} in ('active', 'suspended', 'archived')`,
    ),
  ],
);

export const organisationMembership = pgTable(
  "organisation_membership",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisation.id, { onDelete: "restrict" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    role: text("role", { enum: membershipRoles }).default("owner").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("organisation_membership_organisation_user_unique").on(
      table.organisationId,
      table.userId,
    ),
    index("organisation_membership_user_id_idx").on(table.userId),
    index("organisation_membership_organisation_id_idx").on(
      table.organisationId,
    ),
    check(
      "organisation_membership_role_valid",
      sql`${table.role} in ('owner', 'member')`,
    ),
  ],
);

export const organisationInvitation = pgTable(
  "organisation_invitation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisation.id, { onDelete: "restrict" }),
    email: text("email").notNull(),
    invitedByUserId: text("invited_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    role: text("role").default("member").notNull(),
    status: text("status", { enum: invitationStatuses })
      .default("pending")
      .notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    declinedAt: timestamp("declined_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("organisation_invitation_token_hash_unique").on(
      table.tokenHash,
    ),
    uniqueIndex("organisation_invitation_pending_email_unique")
      .on(table.organisationId, table.email)
      .where(sql`${table.status} = 'pending'`),
    index("organisation_invitation_organisation_id_idx").on(
      table.organisationId,
    ),
    index("organisation_invitation_email_idx").on(table.email),
    index("organisation_invitation_expires_at_idx").on(table.expiresAt),
    check(
      "organisation_invitation_email_normalised",
      sql`${table.email} = lower(btrim(${table.email}))`,
    ),
    check("organisation_invitation_role_member", sql`${table.role} = 'member'`),
    check(
      "organisation_invitation_status_valid",
      sql`${table.status} in ('pending', 'accepted', 'declined', 'revoked', 'expired')`,
    ),
    check(
      "organisation_invitation_resolution_valid",
      sql`(${table.status} = 'pending' and ${table.acceptedAt} is null and ${table.declinedAt} is null and ${table.revokedAt} is null)
        or (${table.status} = 'accepted' and ${table.acceptedAt} is not null and ${table.declinedAt} is null and ${table.revokedAt} is null)
        or (${table.status} = 'declined' and ${table.acceptedAt} is null and ${table.declinedAt} is not null and ${table.revokedAt} is null)
        or (${table.status} = 'revoked' and ${table.acceptedAt} is null and ${table.declinedAt} is null and ${table.revokedAt} is not null)
        or (${table.status} = 'expired' and ${table.acceptedAt} is null and ${table.declinedAt} is null and ${table.revokedAt} is null)`,
    ),
    check(
      "organisation_invitation_expiry_after_creation",
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
  ],
);

export const organisationRelations = relations(
  organisation,
  ({ many, one }) => ({
    creator: one(user, {
      fields: [organisation.createdByUserId],
      references: [user.id],
    }),
    memberships: many(organisationMembership),
    invitations: many(organisationInvitation),
  }),
);

export const organisationInvitationRelations = relations(
  organisationInvitation,
  ({ one }) => ({
    organisation: one(organisation, {
      fields: [organisationInvitation.organisationId],
      references: [organisation.id],
    }),
    invitedBy: one(user, {
      fields: [organisationInvitation.invitedByUserId],
      references: [user.id],
    }),
  }),
);

export const organisationMembershipRelations = relations(
  organisationMembership,
  ({ one }) => ({
    organisation: one(organisation, {
      fields: [organisationMembership.organisationId],
      references: [organisation.id],
    }),
    user: one(user, {
      fields: [organisationMembership.userId],
      references: [user.id],
    }),
  }),
);
