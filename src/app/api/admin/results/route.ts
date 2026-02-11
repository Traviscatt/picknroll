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

    return NextResponse.json({ games, tournamentId: tournament.id });
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

    // If actualTiebreaker is provided, we could store it somewhere
    // For now we'll pass it back in the response
    return NextResponse.json({
      message: `Updated ${updated} game results.`,
      updated,
      actualTiebreaker: actualTiebreaker || null,
    });
  } catch (error) {
    console.error("Error saving results:", error);
    return NextResponse.json(
      { error: "Failed to save results" },
      { status: 500 }
    );
  }
}
