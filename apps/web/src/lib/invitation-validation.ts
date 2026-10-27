import { z } from "zod";

export const invitationEmailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .max(320)
  .transform((email) => email.toLowerCase());

export const createInvitationSchema = z.object({
  email: invitationEmailSchema,
});

export const invitationResponseSchema = z.object({
  token: z
    .string()
    .min(40)
    .max(200)
    .regex(/^[A-Za-z0-9_-]+$/),
  action: z.enum(["accept", "decline"]),
});

export type InvitationResponseInput = z.input<typeof invitationResponseSchema>;
