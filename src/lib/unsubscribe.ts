import { createHmac, timingSafeEqual } from "crypto";

// Signed one-click unsubscribe links for reminder emails (no login needed)
const sign = (userId: string) =>
  createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "dev-secret").update(`unsubscribe:${userId}`).digest("base64url").slice(0, 32);

export function unsubscribeUrl(appUrl: string, userId: string) {
  return `${appUrl}/api/unsubscribe?u=${encodeURIComponent(userId)}&t=${sign(userId)}`;
}

export function verifyUnsubscribe(userId: string, token: string) {
  const expected = Buffer.from(sign(userId));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
