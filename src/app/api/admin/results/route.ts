import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

// GET /api/admin/results - Get all games with results
export async function GET() {
  try {
    const { authorized, response } = await requireAdmin();
    if (!authorized) return response!;

    // Get the current tournament
    const tournament = await db.tournament.findFirst({
      orderBy: { year: "desc" },
    });

    if (!tournament) {
      return NextResponse.json({ games: [], tournamentId: null });
    }

    const games = await db.game.findMany({
      where: { tournamentId: tournament.id },
      include: {
        team1: {
          include: {
            team: { select: { name: true, shortName: true } },
          },
        },
        team2: {
          include: {
            team: { select: { name: true, shortName: true } },
          },
        },
        winner: {
          include: {
            team: { select: { name: true, shortName: true } },
          },
        },
      },
      orderBy: [{ round: "asc" }, { gameNumber: "asc" }],
    });

    const championship = games.find((g) => g.round === 6);
    const championshipTotal =
      championship?.status === "FINAL" && championship.team1Score != null && championship.team2Score != null
        ? championship.team1Score + championship.team2Score
        : null;

    return NextResponse.json({
      games,
      tournamentId: tournament.id,
      actualTiebreakerOverride: tournament.actualTiebreaker,
      championshipTotal,
    });
  } catch (error) {
    console.error("Error fetching results:", error);
    return NextResponse.json(
      { error: "Failed to fetch results" },
      { status: 500 }
    );
  }
}

// POST /api/admin/results - Save game results (winner + scores)
export async function POST(req: NextRequest) {
  try {
    const { authorized, response } = await requireAdmin();
    if (!authorized) return response!;

    const body = await req.json();
    const { results, actualTiebreaker } = body;

    // results: [{gameId, winnerId, team1Score, team2Score}]
    if (!Array.isArray(results)) {
      return NextResponse.json(
        { error: "Results must be an array" },
        { status: 400 }
      );
    }

    let updated = 0;
    for (const result of results) {
      if (!result.gameId) continue;

      await db.game.update({
        where: { id: result.gameId },
        data: {
          winnerId: result.winnerId || null,
          team1Score: result.team1Score != null ? parseInt(result.team1Score) : null,
          team2Score: result.team2Score != null ? parseInt(result.team2Score) : null,
          status: result.winnerId ? "FINAL" : "SCHEDULED",
        },
      });
      updated++;
    }

    // Tiebreaker override for the current tournament (blank clears it, falling back to the championship score)
    let override: number | null = null;
    if (actualTiebreaker !== undefined) {
      const parsed = actualTiebreaker === null || actualTiebreaker === "" ? null : parseInt(actualTiebreaker);
      override = parsed != null && Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
      const tournament = await db.tournament.findFirst({ orderBy: { year: "desc" } });
      if (tournament) {
        await db.tournament.update({ where: { id: tournament.id }, data: { actualTiebreaker: override } });
      }
    }

    return NextResponse.json({
      message: `Updated ${updated} game results.`,
      updated,
      actualTiebreaker: override,
    });
  } catch (error) {
    console.error("Error saving results:", error);
    return NextResponse.json(
      { error: "Failed to save results" },
      { status: 500 }
    );
  }
}
