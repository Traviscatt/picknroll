import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  try {
    const { authorized, response } = await requireAdmin();
    if (!authorized) return response!;

    const [submittedPaidCount, paidBrackets, draftBrackets, totalUsers, pool] = await Promise.all([
      db.bracket.count({ where: { status: { in: ["SUBMITTED", "PAID"] } } }),
      db.bracket.count({ where: { paid: true, status: { in: ["SUBMITTED", "PAID"] } } }),
      db.bracket.count({ where: { status: "DRAFT" } }),
      db.user.count(),
      db.pool.findFirst({ select: { entryFee: true } }),
    ]);

    const totalBrackets = submittedPaidCount + draftBrackets;
    const unpaidBrackets = submittedPaidCount - paidBrackets;
    const entryFee = pool ? parseFloat(pool.entryFee.toString()) : 5;
    const prizePool = paidBrackets * entryFee;

    return NextResponse.json({
      totalBrackets,
      paidBrackets,
      unpaidBrackets,
      draftBrackets,
      totalUsers,
      prizePool,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
