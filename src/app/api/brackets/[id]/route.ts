import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/brackets/[id] - Get a single bracket
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Admins can view any bracket; regular users can only view their own
    // OR brackets from the same pool after the deadline has passed
    const isAdmin = session.user.role === "ADMIN";

    let bracket = await db.bracket.findFirst({
      where: {
        id,
        ...(isAdmin ? {} : { userId: session.user.id }),
      },
      include: {
        pool: true,
        familyMember: true,
        picks: true,
        user: { select: { id: true, name: true } },
      },
    });

    // If not found as owner/admin, check if they're in the same pool and deadline passed
    if (!bracket) {
      const targetBracket = await db.bracket.findFirst({
        where: { id, status: { in: ["SUBMITTED", "PAID"] } },
        include: {
          pool: true,
          familyMember: true,
          picks: true,
          user: { select: { id: true, name: true } },
        },
      });

      if (!targetBracket || !targetBracket.poolId) {
        return NextResponse.json({ error: "Bracket not found" }, { status: 404 });
      }

      // Verify the requesting user is in the same pool
      const membership = await db.poolMember.findFirst({
        where: { userId: session.user.id, poolId: targetBracket.poolId },
      });

      if (!membership) {
        return NextResponse.json({ error: "Bracket not found" }, { status: 404 });
      }

      // Verify the pool deadline has passed
      if (targetBracket.pool && new Date() <= new Date(targetBracket.pool.deadline)) {
        return NextResponse.json(
          { error: "Brackets are hidden until the submission deadline passes" },
          { status: 403 }
        );
      }

      bracket = targetBracket;
    }

    if (!bracket) {
      return NextResponse.json({ error: "Bracket not found" }, { status: 404 });
    }

    const bracketIsOwner = bracket.userId === session.user.id || isAdmin;
    const ownerName = !bracketIsOwner ? (bracket.user?.name || "Unknown") : null;

    // Fetch completed games for this tournament to determine game status
    const tournament = await db.tournament.findFirst({
      orderBy: { year: "desc" },
    });

    // Build a map from bracket-style gameId (e.g. "East-r1-g1") to winner bracket ID
    // Uses same grouping logic as scoring route: group by round+region, sort by gameNumber, assign per-region index
    const completedGames: { bracketGameId: string; winnerBracketId: string | null }[] = [];
    if (tournament) {
      const tournamentTeams = await db.tournamentTeam.findMany({
        where: { tournamentId: tournament.id },
        select: { id: true, seed: true, region: true },
      });
      const ttIdToBracketId = new Map<string, string>();
      for (const tt of tournamentTeams) {
        ttIdToBracketId.set(tt.id, `${tt.region.toLowerCase()}-${tt.seed}`);
      }

      const allGames = await db.game.findMany({
        where: { tournamentId: tournament.id },
        select: {
          round: true,
          gameNumber: true,
          region: true,
          status: true,
          winnerId: true,
        },
      });

      // Group games by round+region, sort by gameNumber, assign per-region indices
      const grouped = new Map<string, typeof allGames>();
      for (const g of allGames) {
        const key = `${g.round}-${g.region || "none"}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(g);
      }

      for (const [, group] of grouped) {
        group.sort((a, b) => a.gameNumber - b.gameNumber);
        for (let i = 0; i < group.length; i++) {
          const g = group[i];
          if (g.status !== "FINAL") continue;

          let bracketGameId: string;
          if (g.region && g.round <= 4) {
            bracketGameId = `${g.region}-r${g.round}-g${i + 1}`;
          } else if (g.round === 5) {
            bracketGameId = `final-four-r5-g${g.gameNumber}`;
          } else {
            bracketGameId = `championship-r6-g${g.gameNumber}`;
          }

          completedGames.push({
            bracketGameId,
            winnerBracketId: g.winnerId ? ttIdToBracketId.get(g.winnerId) || null : null,
          });
        }
      }
    }

    // Calculate rank within pool if bracket is in a pool and submitted
    let rank: number | null = null;
    let totalInPool: number | null = null;
    if (bracket.poolId && bracket.status !== "DRAFT") {
      const poolBrackets = await db.bracket.findMany({
        where: {
          poolId: bracket.poolId,
          status: { in: ["SUBMITTED", "PAID"] },
        },
        select: {
          id: true,
          totalScore: true,
          bonusScore: true,
        },
        orderBy: [
          { totalScore: "desc" },
          { bonusScore: "desc" },
        ],
      });

      totalInPool = poolBrackets.length;
      let currentRank = 0;
      let lastScore = -1;
      for (let i = 0; i < poolBrackets.length; i++) {
        const b = poolBrackets[i];
        const score = b.totalScore + b.bonusScore;
        if (score !== lastScore) {
          currentRank = i + 1;
          lastScore = score;
        }
        if (b.id === bracket.id) {
          rank = currentRank;
          break;
        }
      }
    }

    return NextResponse.json({ ...bracket, rank, totalInPool, completedGames, isOwner: bracketIsOwner, ownerName });
  } catch (error) {
    console.error("Error fetching bracket:", error);
    return NextResponse.json(
      { error: "Failed to fetch bracket" },
      { status: 500 }
    );
  }
}

// PATCH /api/brackets/[id] - Update a bracket
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Verify ownership
    const existing = await db.bracket.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Bracket not found" }, { status: 404 });
    }

    const { name, entryName, status, tiebreaker, picks, poolId } = body;

    // Check deadline for any update to a bracket in a pool
    const bracketPoolId = poolId || existing.poolId;
    if (bracketPoolId) {
      const pool = await db.pool.findUnique({
        where: { id: bracketPoolId },
        select: { deadline: true, status: true },
      });

      if (pool) {
        if (pool.status !== "OPEN") {
          return NextResponse.json(
            { error: "This pool is no longer accepting changes." },
            { status: 400 }
          );
        }
        if (new Date() > pool.deadline) {
          return NextResponse.json(
            { error: "The deadline for this pool has passed. Brackets are locked." },
            { status: 400 }
          );
        }
      }
    }

    const bracket = await db.bracket.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(entryName && { entryName }),
        ...(status && { status }),
        ...(tiebreaker !== undefined && { tiebreaker }),
        ...(picks !== undefined && { picksData: JSON.stringify(picks) }),
        ...(status === "SUBMITTED" && !existing.submittedAt && { submittedAt: new Date() }),
      },
    });

    return NextResponse.json(bracket);
  } catch (error) {
    console.error("Error updating bracket:", error);
    return NextResponse.json(
      { error: "Failed to update bracket" },
      { status: 500 }
    );
  }
}

// DELETE /api/brackets/[id] - Delete a bracket
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await db.bracket.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Bracket not found" }, { status: 404 });
    }

    await db.bracket.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting bracket:", error);
    return NextResponse.json(
      { error: "Failed to delete bracket" },
      { status: 500 }
    );
  }
}
