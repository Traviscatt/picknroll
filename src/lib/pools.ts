import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/** Newest season first (then newest pool), so a member of several seasons lands on the current one */
export const NEWEST_POOL_FIRST: Prisma.PoolOrderByWithRelationInput[] = [{ tournament: { year: "desc" } }, { createdAt: "desc" }];

/** The user's membership in their current (newest) pool, optionally only pools they administer */
export function currentMembership(userId: string, { adminOnly = false } = {}) {
  return db.poolMember.findFirst({
    where: { userId, ...(adminOnly && { role: "ADMIN" }) },
    orderBy: NEWEST_POOL_FIRST.map((pool) => ({ pool })),
    include: { pool: true },
  });
}
