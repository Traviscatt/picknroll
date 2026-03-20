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
    const isAdmin = session.user.role === "ADMIN";
    const bracket = await db.bracket.findFirst({
      where: {
        id,
        ...(isAdmin ? {} : { userId: session.user.id }),
      },
      include: {
        pool: true,
        familyMember: true,
        picks: true,
        user: isAdmin ? { select: { id: true, name: true, email: true } } : false,
      },
    });

    if (!bracket) {
      return NextResponse.json({ error: "Bracket not found" }, { status: 404 });
    }

    // Fetch completed games for this tournament to determine game status
    const tournament = await db.tournament.findFirst({
      orderBy: { year: "desc" },
    });

    let completedGames: { round: number; gameNumber: number; region: string | null; winnerBracketId: string | null }[] = [];
    if (tournament) {
      // Get tournament teams to map TournamentTeam.id -> bracket-style ID (e.g., "east-1")
      const tournamentTeams = await db.tournamentTeam.findMany({
        where: { tournamentId: tournament.id },
        select: { id: true, seed: true, region: true },
      });
      const ttIdToBracketId = new Map<string, string>();
      for (const tt of tournamentTeams) {
        ttIdToBracketId.set(tt.id, `${tt.region.toLowerCase()}-${tt.seed}`);
      }

      const games = await db.game.findMany({
        where: {
          tournamentId: tournament.id,
          status: "FINAL",
        },
        select: {
          round: true,
          gameNumber: true,
          region: true,
          winnerId: true,
        },
      });
      
      completedGames = games.map(g => ({
        round: g.round,
        gameNumber: g.gameNumber,
        region: g.region,
        winnerBracketId: g.winnerId ? ttIdToBracketId.get(g.winnerId) || null : null,
      }));
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

    return NextResponse.json({ ...bracket, rank, totalInPool, completedGames });
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
