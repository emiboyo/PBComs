import { organisationRoleCodes } from "@pbcoms/shared";
import { z } from "zod";

export const membershipIdSchema = z.string().uuid();
export const roleChangeSchema = z
  .object({ role: z.enum(organisationRoleCodes) })
  .strict();
export type RoleManagementErrorCode =
  | "unauthenticated"
  | "email_unverified"
  | "not_found"
  | "invalid_input"
  | "last_owner"
  | "ownership_protected";
export class RoleManagementError extends Error {
  constructor(readonly code: RoleManagementErrorCode) {
    super(code);
  }
}
export function roleErrorResponse(error: unknown) {
  const code =
    error instanceof RoleManagementError ? error.code : "request_failed";
  const status =
    code === "unauthenticated"
      ? 401
      : code === "email_unverified"
        ? 403
        : code === "not_found"
          ? 404
          : code === "invalid_input"
            ? 400
            : code === "request_failed"
              ? 500
              : 409;
  return Response.json(
    { ok: false, code },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
