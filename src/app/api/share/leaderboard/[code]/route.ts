import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActualTiebreaker, rankBrackets, SCORED_STATUSES } from "@/lib/scoring-service";

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
        tournamentId: true,
      },
    });

    if (!pool) {
      return NextResponse.json({ error: "Invalid share code" }, { status: 404 });
    }

    // Get all submitted brackets in this pool
    const brackets = await db.bracket.findMany({
      where: {
        poolId: pool.id,
        status: { in: SCORED_STATUSES },
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

    // Rank by combined score (totalScore + bonusScore); ties broken by tiebreaker once the championship is final
    const actualTiebreaker = await getActualTiebreaker(pool.tournamentId);
    const entries = rankBrackets(brackets, actualTiebreaker).map((b) => ({
      rank: b.rank,
      name: b.entryName,
      bracketName: b.name,
      score: b.score,
      tiebreaker: b.tiebreaker,
    }));

    const paidCount = brackets.filter((b) => b.paid).length;
    const entryFee = parseFloat(pool.entryFee.toString());
    const totalPrize = paidCount * entryFee;

    return NextResponse.json({
      poolName: pool.name,
      entries,
      totalPrize,
      totalEntries: brackets.length,
      actualTiebreaker,
    });
  } catch (error) {
    console.error("Error fetching shared leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
