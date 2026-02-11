import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

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
      select: { poolId: true },
    });

    if (!poolMembership) {
      return NextResponse.json({ entries: [], userRank: null, totalPrize: 0 });
    }

    // Get all submitted brackets in this pool
    const brackets = await db.bracket.findMany({
      where: {
        poolId: poolMembership.poolId,
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
        userId: true,
        familyMember: {
          select: { name: true },
        },
      },
      orderBy: [
        { totalScore: "desc" },
        { bonusScore: "desc" },
      ],
    });

    // Build ranked entries
    let currentRank = 0;
    let lastScore = -1;
    let userRank: number | null = null;

    const entries = brackets.map((b, idx) => {
      const totalWithBonus = b.totalScore + b.bonusScore;
      if (totalWithBonus !== lastScore) {
        currentRank = idx + 1;
        lastScore = totalWithBonus;
      }

      if (b.userId === session.user.id && userRank === null) {
        userRank = currentRank;
      }

      return {
        rank: currentRank,
        bracketId: b.id,
        name: b.entryName,
        bracketName: b.name,
        score: b.totalScore + b.bonusScore,
        tiebreaker: b.tiebreaker,
        paid: b.paid,
        isCurrentUser: b.userId === session.user.id,
      };
    });

    const paidCount = brackets.filter((b) => b.paid).length;
    const totalPrize = paidCount * 5; // $5 entry fee

    return NextResponse.json({
      entries,
      userRank,
      totalPrize,
      totalEntries: brackets.length,
      paidEntries: paidCount,
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
