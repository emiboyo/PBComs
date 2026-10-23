import { describe, expect, it } from "vitest";
import { hasTrustedRequestOrigin } from "./request-origin";

function requestWithOrigin(origin?: string) {
  return { headers: new Headers(origin === undefined ? {} : { origin }) };
}

describe("organisation request Origin validation", () => {
  const applicationUrl = "https://app.pbcoms.test";

  it("accepts a legitimate same-origin browser request", () => {
    expect(
      hasTrustedRequestOrigin(
        requestWithOrigin("https://app.pbcoms.test"),
        `${applicationUrl}/`,
      ),
    ).toBe(true);
  });

  it("normalises default ports before comparison", () => {
    expect(
      hasTrustedRequestOrigin(
        requestWithOrigin("https://app.pbcoms.test:443"),
        applicationUrl,
      ),
    ).toBe(true);
  });

  it.each([
    "https://evil.example",
    "http://app.pbcoms.test",
    "https://app.pbcoms.test.evil.example",
    "https://app.pbcoms.test/path",
    "https://app.pbcoms.test?spoofed=true",
    "https://user@app.pbcoms.test",
    "null",
    "not a URL",
  ])("rejects untrusted Origin %s", (origin) => {
    expect(
      hasTrustedRequestOrigin(requestWithOrigin(origin), applicationUrl),
    ).toBe(false);
  });

  it("fails closed when Origin is missing", () => {
    expect(hasTrustedRequestOrigin(requestWithOrigin(), applicationUrl)).toBe(
      false,
    );
  });
});
