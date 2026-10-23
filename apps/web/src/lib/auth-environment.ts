import { config } from "dotenv";
import { resolve } from "node:path";
import { z } from "zod";

config({ path: resolve(process.cwd(), "../../.env"), quiet: true });

const smtpSchema = z.object({
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().min(1),
  SMTP_PASSWORD: z.string().min(1),
  SMTP_FROM: z.string().email(),
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
