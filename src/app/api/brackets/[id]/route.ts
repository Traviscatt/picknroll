import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { bracketInputSchema, poolLockedReason, validatePicks } from "@/lib/bracket-validation";
import { eliminatedTeams, getCurrentTournament, loadTournamentResults, rankPool } from "@/lib/scoring-service";
import { loadRegions, regionsForPool } from "@/lib/tournament-service";
import { parsePicksData } from "@/lib/scoring-engine";
import { summarizeBracket, type BracketSummary } from "@/lib/bracket-summary";

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

    // Completed games in bracket ID space (e.g. "East-r1-g1" -> winner "east-1")
    const tournamentId = bracket.pool?.tournamentId ?? (await getCurrentTournament())?.id;
    const completedGames: { bracketGameId: string; winnerBracketId: string | null }[] = [];
    let actualTiebreaker: number | null = null;
    let eliminated = new Set<string>();
    let summary: BracketSummary | null = null;
    if (tournamentId) {
      const [results, regions] = await Promise.all([loadTournamentResults(tournamentId), loadRegions(tournamentId)]);
      actualTiebreaker = results.actualTiebreaker;
      eliminated = eliminatedTeams(results);
      for (const [bracketGameId, winnerBracketId] of results.winners) completedGames.push({ bracketGameId, winnerBracketId });
      summary = summarizeBracket(parsePicksData(bracket.picksData), results.winners, eliminated, regions);
    }

    // Rank within the pool (same order as the standings)
    let rank: number | null = null;
    let totalInPool: number | null = null;
    if (bracket.poolId && bracket.status !== "DRAFT") {
      const pool = await rankPool(bracket.poolId, actualTiebreaker);
      totalInPool = pool.total;
      rank = pool.ranks.get(bracket.id) ?? null;
    }

    return NextResponse.json({ ...bracket, rank, totalInPool, completedGames, eliminated: [...eliminated], summary, isOwner: bracketIsOwner, ownerName });
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
      { requireComplete: isSubmitted, regions: await regionsForPool(existing.poolId) }
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
