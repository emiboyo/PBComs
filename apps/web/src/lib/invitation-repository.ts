import { schema } from "@pbcoms/database";
import { and, asc, eq, lte } from "drizzle-orm";
import { databaseClient } from "./database";

export type InvitationFailureCode =
  "not_found" | "email_mismatch" | "expired" | "not_pending" | "already_member";

export class InvitationStateError extends Error {
  constructor(readonly code: InvitationFailureCode) {
    super(code);
  }
}

export function listOrganisationInvitations(organisationId: string) {
  return databaseClient.db
    .select({
      id: schema.organisationInvitation.id,
      email: schema.organisationInvitation.email,
      role: schema.organisationInvitation.role,
      status: schema.organisationInvitation.status,
      createdAt: schema.organisationInvitation.createdAt,
      expiresAt: schema.organisationInvitation.expiresAt,
      acceptedAt: schema.organisationInvitation.acceptedAt,
      declinedAt: schema.organisationInvitation.declinedAt,
      revokedAt: schema.organisationInvitation.revokedAt,
    })
    .from(schema.organisationInvitation)
    .where(eq(schema.organisationInvitation.organisationId, organisationId))
    .orderBy(
      asc(schema.organisationInvitation.status),
      asc(schema.organisationInvitation.createdAt),
    );
}

export async function insertInvitation(input: {
  organisationId: string;
  email: string;
  invitedByUserId: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
}) {
  return databaseClient.db.transaction(async (tx) => {
    const [member] = await tx
      .select({ id: schema.organisationMembership.id })
      .from(schema.organisationMembership)
      .innerJoin(
        schema.user,
        eq(schema.organisationMembership.userId, schema.user.id),
      )
      .where(
        and(
          eq(
            schema.organisationMembership.organisationId,
            input.organisationId,
          ),
          eq(schema.user.email, input.email),
        ),
      )
      .limit(1);
    if (member) throw new InvitationStateError("already_member");
    const [created] = await tx
      .insert(schema.organisationInvitation)
      .values({ ...input, role: "member", status: "pending" })
      .returning();
    if (!created) throw new Error("Invitation insert returned no record");
    return created;
  });
}

async function lockInvitation(
  tx: Parameters<Parameters<typeof databaseClient.db.transaction>[0]>[0],
  tokenHash: string,
) {
  const [result] = await tx
    .select({
      invitation: schema.organisationInvitation,
      organisationStatus: schema.organisation.status,
    })
    .from(schema.organisationInvitation)
    .innerJoin(
      schema.organisation,
      eq(schema.organisationInvitation.organisationId, schema.organisation.id),
    )
    .where(eq(schema.organisationInvitation.tokenHash, tokenHash))
    .for("update")
    .limit(1);
  if (!result || result.organisationStatus !== "active")
    throw new InvitationStateError("not_found");
  return result.invitation;
}

async function assertPendingRecipient(
  tx: Parameters<Parameters<typeof databaseClient.db.transaction>[0]>[0],
  tokenHash: string,
  email: string,
  now: Date,
) {
  const invitation = await lockInvitation(tx, tokenHash);
  if (invitation.email !== email)
    throw new InvitationStateError("email_mismatch");
  if (invitation.status === "expired")
    throw new InvitationStateError("expired");
  if (invitation.status !== "pending")
    throw new InvitationStateError("not_pending");
  if (invitation.expiresAt <= now) {
    throw new InvitationStateError("expired");
  }
  return invitation;
}

export function acceptInvitationTransaction(input: {
  tokenHash: string;
  email: string;
  userId: string;
  now: Date;
}) {
  return databaseClient.db.transaction(async (tx) => {
    const invitation = await assertPendingRecipient(
      tx,
      input.tokenHash,
      input.email,
      input.now,
    );
    const [existing] = await tx
      .select({ id: schema.organisationMembership.id })
      .from(schema.organisationMembership)
      .where(
        and(
          eq(
            schema.organisationMembership.organisationId,
            invitation.organisationId,
          ),
          eq(schema.organisationMembership.userId, input.userId),
        ),
      )
      .limit(1);
    if (existing) throw new InvitationStateError("already_member");
    await tx.insert(schema.organisationMembership).values({
      organisationId: invitation.organisationId,
      userId: input.userId,
      role: "member",
    });
    const [updated] = await tx
      .update(schema.organisationInvitation)
      .set({ status: "accepted", acceptedAt: input.now })
      .where(
        and(
          eq(schema.organisationInvitation.id, invitation.id),
          eq(schema.organisationInvitation.status, "pending"),
        ),
      )
      .returning({ id: schema.organisationInvitation.id });
    if (!updated) throw new InvitationStateError("not_pending");
    return { organisationId: invitation.organisationId };
  });
}

export function declineInvitationTransaction(input: {
  tokenHash: string;
  email: string;
  now: Date;
}) {
  return databaseClient.db.transaction(async (tx) => {
    const invitation = await assertPendingRecipient(
      tx,
      input.tokenHash,
      input.email,
      input.now,
    );
    await tx
      .update(schema.organisationInvitation)
      .set({ status: "declined", declinedAt: input.now })
      .where(eq(schema.organisationInvitation.id, invitation.id));
    return { organisationId: invitation.organisationId };
  });
}

export function revokeInvitationTransaction(input: {
  organisationId: string;
  invitationId: string;
  now: Date;
}) {
  return databaseClient.db.transaction(async (tx) => {
    const [invitation] = await tx
      .select()
      .from(schema.organisationInvitation)
      .where(
        and(
          eq(schema.organisationInvitation.id, input.invitationId),
          eq(
            schema.organisationInvitation.organisationId,
            input.organisationId,
          ),
        ),
      )
      .for("update")
      .limit(1);
    if (!invitation) throw new InvitationStateError("not_found");
    if (invitation.status !== "pending")
      throw new InvitationStateError("not_pending");
    await tx
      .update(schema.organisationInvitation)
      .set({ status: "revoked", revokedAt: input.now })
      .where(eq(schema.organisationInvitation.id, invitation.id));
  });
}

export function expirePendingInvitations(now: Date) {
  return databaseClient.db
    .update(schema.organisationInvitation)
    .set({ status: "expired" })
    .where(
      and(
        eq(schema.organisationInvitation.status, "pending"),
        lte(schema.organisationInvitation.expiresAt, now),
      ),
    );
}
