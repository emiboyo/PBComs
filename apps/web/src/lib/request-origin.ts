export function hasTrustedRequestOrigin(
  request: Pick<Request, "headers">,
  applicationUrl: string,
): boolean {
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") return false;

  try {
    const suppliedOrigin = new URL(origin);
    const trustedOrigin = new URL(applicationUrl);
    if (
      !["http:", "https:"].includes(suppliedOrigin.protocol) ||
      suppliedOrigin.username ||
      suppliedOrigin.password ||
      suppliedOrigin.pathname !== "/" ||
      suppliedOrigin.search ||
      suppliedOrigin.hash
    )
      return false;
    return suppliedOrigin.origin === trustedOrigin.origin;
  } catch {
    return false;
  }
}
