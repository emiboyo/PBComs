import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { schema } from "@pbcoms/database";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { authEnvironment } from "./auth-environment";
import { createEmailDelivery } from "./email";
import { databaseClient } from "./database";

const emailDelivery = createEmailDelivery(authEnvironment);

export const auth = betterAuth({
  appName: "PBcoms",
  baseURL: authEnvironment.BETTER_AUTH_URL,
  secret: authEnvironment.BETTER_AUTH_SECRET,
  trustedOrigins: [authEnvironment.BETTER_AUTH_URL],
  database: drizzleAdapter(databaseClient.db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    autoSignIn: false,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 3600,
    sendResetPassword: async ({ user, url }) => {
      await emailDelivery.send({
        to: user.email,
        subject: "Reset your PBcoms password",
        text: `Use this single-use link within one hour to reset your password: ${url}`,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    expiresIn: 3600,
    autoSignInAfterVerification: false,
    sendVerificationEmail: async ({ user, url }) => {
      await emailDelivery.send({
        to: user.email,
        subject: "Verify your PBcoms email",
        text: `Use this single-use link within one hour to verify your email: ${url}`,
      });
    },
  },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 300, max: 5 },
      "/request-password-reset": { window: 300, max: 3 },
      "/send-verification-email": { window: 300, max: 3 },
    },
  },
  advanced: {
    cookiePrefix: "pbcoms",
    useSecureCookies: authEnvironment.NODE_ENV === "production",
    database: { generateId: "uuid" },
  },
  plugins: [nextCookies()],
});
