import { config } from "dotenv";
import { resolve } from "node:path";
import { z } from "zod";

config({ path: resolve(process.cwd(), "../../.env"), quiet: true });

export const documentedAuthSecretPlaceholder =
  "replace-with-a-cryptographically-random-secret-at-least-32-characters";

const emailAddressSchema = z.string().email();

function isValidMailbox(value: string): boolean {
  const trimmed = value.trim();
  if (emailAddressSchema.safeParse(trimmed).success) return true;
  if (/[\r\n]/.test(trimmed)) return false;
  const displayMailbox = /^(.+?)\s*<([^<>]+)>$/.exec(trimmed);
  return Boolean(
    displayMailbox?.[1]?.trim() &&
    emailAddressSchema.safeParse(displayMailbox[2]?.trim()).success,
  );
}

const smtpSchema = z.object({
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().min(1),
  SMTP_PASSWORD: z.string().min(1),
  SMTP_FROM: z.string().refine(isValidMailbox, {
    message:
      "SMTP_FROM must be an email address or a display name with an email address.",
  }),
});

const authEnvironmentSchema = z
  .object({
    BETTER_AUTH_SECRET: z
      .string()
      .min(32, "BETTER_AUTH_SECRET must contain at least 32 characters."),
    BETTER_AUTH_URL: z.string().url(),
    EMAIL_DELIVERY_MODE: z.enum(["preview", "smtp"]).default("preview"),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.string().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_FROM: z.string().optional(),
  })
  .superRefine((value, context) => {
    if (
      value.NODE_ENV === "production" &&
      value.BETTER_AUTH_SECRET === documentedAuthSecretPlaceholder
    ) {
      context.addIssue({
        code: "custom",
        path: ["BETTER_AUTH_SECRET"],
        message:
          "Production cannot use the documented BETTER_AUTH_SECRET placeholder.",
      });
    }

    if (
      value.NODE_ENV === "production" &&
      value.EMAIL_DELIVERY_MODE !== "smtp"
    ) {
      context.addIssue({
        code: "custom",
        path: ["EMAIL_DELIVERY_MODE"],
        message: "Production requires EMAIL_DELIVERY_MODE=smtp.",
      });
    }

    if (value.EMAIL_DELIVERY_MODE === "smtp") {
      const result = smtpSchema.safeParse(value);
      if (!result.success) {
        context.addIssue({
          code: "custom",
          path: ["SMTP_HOST"],
          message:
            "Complete valid SMTP configuration is required for SMTP delivery.",
        });
      }
    }
  });

export type AuthEnvironment = z.infer<typeof authEnvironmentSchema>;

export function parseAuthEnvironment(
  environment: Record<string, string | undefined>,
): AuthEnvironment {
  return authEnvironmentSchema.parse(environment);
}

export const authEnvironment = parseAuthEnvironment(process.env);
