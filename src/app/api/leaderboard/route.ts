import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActualTiebreaker, rankBrackets, SCORED_STATUSES } from "@/lib/scoring-service";

// GET /api/leaderboard - Get leaderboard data for user's pool
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find user's pool
    const poolMembership = await db.poolMember.findFirst({
      where: { userId: session.user.id },
      select: {
        poolId: true,
        pool: { select: { viewCode: true, entryFee: true, tournamentId: true } },
      },
    });

    if (!poolMembership) {
      return NextResponse.json({ entries: [], userRank: null, totalPrize: 0 });
    }

    // Get all submitted brackets in this pool
    const brackets = await db.bracket.findMany({
      where: {
        poolId: poolMembership.poolId,
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
        userId: true,
        familyMember: {
          select: { name: true },
        },
      },
    });

    // Rank by combined score (totalScore + bonusScore); ties broken by tiebreaker once the championship is final
    const actualTiebreaker = await getActualTiebreaker(poolMembership.pool.tournamentId);
    const ranked = rankBrackets(brackets, actualTiebreaker);

    const userEntry = ranked.find((b) => b.userId === session.user.id);
    const userRank = userEntry?.rank ?? null;
    const userScore = userEntry?.score ?? null;

    const entries = ranked.map((b) => ({
      rank: b.rank,
      bracketId: b.id,
      name: b.entryName,
      bracketName: b.name,
      score: b.score,
      tiebreaker: b.tiebreaker,
      paid: b.paid,
      isCurrentUser: b.userId === session.user.id,
    }));

    const paidCount = brackets.filter((b) => b.paid).length;
    const entryFee = poolMembership.pool?.entryFee 
      ? parseFloat(poolMembership.pool.entryFee.toString()) 
      : 5;
    const totalPrize = paidCount * entryFee;

    return NextResponse.json({
      poolId: poolMembership.poolId,
      entries,
      userRank,
      userScore,
      totalPrize,
      totalEntries: brackets.length,
      paidEntries: paidCount,
      viewCode: poolMembership.pool?.viewCode || null,
      actualTiebreaker,
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
