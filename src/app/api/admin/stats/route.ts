import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  try {
    const { authorized, response } = await requireAdmin();
    if (!authorized) return response!;

    const [totalBrackets, paidBrackets, totalUsers] = await Promise.all([
      db.bracket.count(),
      db.bracket.count({ where: { paid: true } }),
      db.user.count(),
    ]);

    const unpaidBrackets = totalBrackets - paidBrackets;
    const entryFee = 5; // TODO: Get from pool settings
    const prizePool = paidBrackets * entryFee;

    return NextResponse.json({
      totalBrackets,
      paidBrackets,
      unpaidBrackets,
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
