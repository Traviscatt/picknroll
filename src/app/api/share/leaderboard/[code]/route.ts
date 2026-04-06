import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/share/leaderboard/[code] - Public leaderboard by viewCode (no auth)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const pool = await db.pool.findUnique({
      where: { viewCode: code },
      select: {
        id: true,
        name: true,
        entryFee: true,
      },
    });

    if (!pool) {
      return NextResponse.json({ error: "Invalid share code" }, { status: 404 });
    }

    // Get all submitted brackets in this pool
    const brackets = await db.bracket.findMany({
      where: {
        poolId: pool.id,
        status: { in: ["SUBMITTED", "PAID"] },
      },
      select: {
        id: true,
        name: true,
        entryName: true,
        totalScore: true,
        bonusScore: true,
        tiebreaker: true,
        paid: true,
      },
    });

    // Sort by combined score (totalScore + bonusScore) so bonus is reflected in rankings
    brackets.sort((a, b) => {
      const aTotal = a.totalScore + a.bonusScore;
      const bTotal = b.totalScore + b.bonusScore;
      return bTotal - aTotal;
    });

    // Build ranked entries
    let currentRank = 0;
    let lastScore = -1;

    const entries = brackets.map((b, idx) => {
      const totalWithBonus = b.totalScore + b.bonusScore;
      if (totalWithBonus !== lastScore) {
        currentRank = idx + 1;
        lastScore = totalWithBonus;
      }

      return {
        rank: currentRank,
        name: b.entryName,
        bracketName: b.name,
        score: b.totalScore + b.bonusScore,
        tiebreaker: b.tiebreaker,
      };
    });

    const paidCount = brackets.filter((b) => b.paid).length;
    const entryFee = parseFloat(pool.entryFee.toString());
    const totalPrize = paidCount * entryFee;

    return NextResponse.json({
      poolName: pool.name,
      entries,
      totalPrize,
      totalEntries: brackets.length,
    });
  } catch (error) {
    console.error("Error fetching shared leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
