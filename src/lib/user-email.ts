import { db } from "@/lib/db";

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

// Case-insensitive lookup: some existing accounts were registered with capital letters
export function findUserByEmail(email: string) {
  return db.user.findFirst({
    where: { email: { equals: email.trim(), mode: "insensitive" } },
  });
}
