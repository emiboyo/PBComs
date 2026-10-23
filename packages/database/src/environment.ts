import { z } from "zod";

const databaseEnvironmentSchema = z.object({
  DATABASE_URL: z
    .string({ error: "DATABASE_URL is required." })
    .min(1, "DATABASE_URL is required.")
    .refine(
      (value) =>
        value.startsWith("postgresql://") || value.startsWith("postgres://"),
      {
        message: "DATABASE_URL must be a PostgreSQL connection URL.",
      },
    ),
});

export type DatabaseEnvironment = z.infer<typeof databaseEnvironmentSchema>;

export function parseDatabaseEnvironment(
  environment: Record<string, string | undefined>,
): DatabaseEnvironment {
  return databaseEnvironmentSchema.parse({
    DATABASE_URL: environment.DATABASE_URL,
  });
}
