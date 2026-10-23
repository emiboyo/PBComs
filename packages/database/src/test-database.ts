const testDatabaseNamePattern = /(?:^|[_-])test(?:$|[_-])/i;

export function assertDedicatedTestDatabase(
  environment: Record<string, string | undefined>,
): string {
  const value = environment.DATABASE_TEST_URL;
  if (!value) {
    throw new Error(
      "DATABASE_TEST_URL is required and must identify a dedicated test database.",
    );
  }
  if (environment.NODE_ENV === "production") {
    throw new Error("Destructive database tests cannot run in production.");
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("DATABASE_TEST_URL must be a valid PostgreSQL URL.");
  }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error("DATABASE_TEST_URL must be a valid PostgreSQL URL.");
  }

  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (
    !databaseName ||
    databaseName.includes("/") ||
    !testDatabaseNamePattern.test(databaseName)
  ) {
    throw new Error(
      "DATABASE_TEST_URL database name must contain a standalone 'test' marker.",
    );
  }

  for (const key of [
    "DATABASE_DEVELOPMENT_URL",
    "DATABASE_PRODUCTION_URL",
  ] as const) {
    if (
      environment[key] &&
      normaliseDatabaseUrl(environment[key]) === normaliseDatabaseUrl(value)
    ) {
      throw new Error(`DATABASE_TEST_URL must not match ${key}.`);
    }
  }
  if (
    environment.DATABASE_URL &&
    normaliseDatabaseUrl(environment.DATABASE_URL) ===
      normaliseDatabaseUrl(value) &&
    environment.NODE_ENV !== "test"
  ) {
    throw new Error(
      "DATABASE_TEST_URL must not match DATABASE_URL outside the test environment.",
    );
  }
  return value;
}

function normaliseDatabaseUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString();
  } catch {
    return value;
  }
}
