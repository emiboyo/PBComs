import { describe, expect, it } from "vitest";
import {
  generateInvitationToken,
  hashInvitationToken,
  invitationTokenMatches,
} from "./invitation-token";

describe("invitation tokens", () => {
  it("generates unique 256-bit URL-safe tokens", () => {
    const first = generateInvitationToken();
    const second = generateInvitationToken();
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first).not.toBe(second);
  });

  it("hashes deterministically without retaining the raw token", () => {
    const token = generateInvitationToken();
    const hash = hashInvitationToken(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(token);
    expect(invitationTokenMatches(token, hash)).toBe(true);
    expect(invitationTokenMatches(generateInvitationToken(), hash)).toBe(false);
  });
});
