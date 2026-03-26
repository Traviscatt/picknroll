import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/pool/pick-stats - Get pick distribution stats for user's pool
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
        pool: { select: { deadline: true } },
      },
    });

    if (!poolMembership) {
      return NextResponse.json({ championshipPicks: [], totalBrackets: 0 });
    }

    // Only show stats after the deadline has passed
    if (poolMembership.pool && new Date() <= new Date(poolMembership.pool.deadline)) {
      return NextResponse.json({ championshipPicks: [], totalBrackets: 0 });
    }

    // Get all submitted brackets in this pool
    const brackets = await db.bracket.findMany({
      where: {
        poolId: poolMembership.poolId,
        status: { in: ["SUBMITTED", "PAID"] },
      },
      select: {
        picksData: true,
      },
    });

    const totalBrackets = brackets.length;
    if (totalBrackets === 0) {
      return NextResponse.json({ championshipPicks: [], totalBrackets: 0 });
    }

    // Aggregate championship picks (first choice in championship game)
    // Championship game IDs start with "championship-"
    const champCounts = new Map<string, number>();

    for (const bracket of brackets) {
      if (!bracket.picksData) continue;
      try {
        const picks = JSON.parse(bracket.picksData) as {
          gameId: string;
          round: number;
          choices: string[];
        }[];

        const champPick = picks.find((p) => p.gameId.startsWith("championship-"));
        if (champPick && champPick.choices.length > 0) {
          // Count the first choice as their primary championship pick
          const firstChoice = champPick.choices[0];
          champCounts.set(firstChoice, (champCounts.get(firstChoice) || 0) + 1);
        }
      } catch {
        // Skip malformed picksData
      }
    }

    // Sort by count descending
    const championshipPicks = Array.from(champCounts.entries())
      .map(([teamId, count]) => ({
        teamId,
        count,
        percentage: Math.round((count / totalBrackets) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({ championshipPicks, totalBrackets });
  } catch (error) {
    console.error("Error fetching pick stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch pick stats" },
      { status: 500 }
    );
  }
}
