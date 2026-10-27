import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function generateInvitationToken() {
  return randomBytes(32).toString("base64url");
}

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function invitationTokenMatches(token: string, expectedHash: string) {
  const supplied = Buffer.from(hashInvitationToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}
