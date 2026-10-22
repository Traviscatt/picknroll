import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { bracketInputSchema, poolLockedReason, validatePicks } from "@/lib/bracket-validation";

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
      });

      // Sort by combined score so bonus is reflected in rankings
      poolBrackets.sort((a, b) => (b.totalScore + b.bonusScore) - (a.totalScore + a.bonusScore));

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
    const parsed = bracketInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

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

    // poolId in the body is ignored: the deadline always comes from the bracket's own pool
    const { name, entryName, status, tiebreaker, picks } = parsed.data;

    // Check deadline for any update to a bracket in a pool
    if (existing.poolId) {
      const pool = await db.pool.findUnique({
        where: { id: existing.poolId },
        select: { deadline: true, status: true },
      });
      const lockedReason = pool ? poolLockedReason(pool) : "This bracket's pool no longer exists.";
      if (lockedReason) {
        return NextResponse.json({ error: lockedReason }, { status: 400 });
      }
    }

    // Resubmitting a bracket the admin marked PAID keeps it PAID
    const nextStatus = status === "SUBMITTED" && existing.status === "PAID" ? "PAID" : status ?? existing.status;
    const isSubmitted = nextStatus !== "DRAFT";

    let picksData: string | undefined;
    const picksValidation = validatePicks(
      picks !== undefined ? picks : JSON.parse(existing.picksData || "[]"),
      { requireComplete: isSubmitted }
    );
    if (!picksValidation.ok) {
      return NextResponse.json({ error: picksValidation.error }, { status: 400 });
    }
    if (picks !== undefined) picksData = JSON.stringify(picksValidation.picks);

    const nextTiebreaker = tiebreaker !== undefined ? tiebreaker : existing.tiebreaker;
    if (isSubmitted && nextTiebreaker == null) {
      return NextResponse.json({ error: "A tiebreaker is required to submit." }, { status: 400 });
    }

    const bracket = await db.bracket.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(entryName && { entryName }),
        status: nextStatus,
        ...(tiebreaker !== undefined && { tiebreaker }),
        ...(picksData !== undefined && { picksData }),
        ...(isSubmitted && !existing.submittedAt && { submittedAt: new Date() }),
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

    // Submitted brackets stay in the pool once it locks
    if (existing.poolId && existing.status !== "DRAFT") {
      const pool = await db.pool.findUnique({
        where: { id: existing.poolId },
        select: { deadline: true, status: true },
      });
      if (pool && poolLockedReason(pool)) {
        return NextResponse.json(
          { error: "Submitted brackets can't be deleted after the pool locks." },
          { status: 400 }
        );
      }
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
