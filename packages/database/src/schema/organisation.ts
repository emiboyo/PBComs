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
export const organisationRoles = ["owner"] as const;

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
    role: text("role", { enum: organisationRoles }).default("owner").notNull(),
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
    check("organisation_membership_role_valid", sql`${table.role} = 'owner'`),
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
