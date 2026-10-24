import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildTeamKeyMaps } from "@/lib/scoring-engine";
import { accessiblePool } from "@/lib/pools";

// GET /api/eliminated-teams?poolId= - Bracket-style team IDs (e.g. "east-1") of eliminated teams
// in a pool's tournament (default: the newest tournament)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const poolId = new URL(request.url).searchParams.get("poolId");
    const pool = poolId ? await accessiblePool(poolId, session.user.id, session.user.role === "ADMIN") : null;
    if (poolId && !pool) {
      return NextResponse.json({ eliminated: [] });
    }
    const tournament = pool
      ? await db.tournament.findUnique({ where: { id: pool.tournamentId } })
      : await db.tournament.findFirst({ orderBy: { year: "desc" } });

    if (!tournament) {
      return NextResponse.json({ eliminated: [] });
    }

    // Get all tournament teams to build reverse map: TournamentTeam.id -> "east-1"
    const tournamentTeams = await db.tournamentTeam.findMany({
      where: { tournamentId: tournament.id },
      select: { id: true, seed: true, region: true },
    });

    const { idToKey: ttIdToBracketId } = buildTeamKeyMaps(tournamentTeams);

    // Get all completed games
    const games = await db.game.findMany({
      where: {
        tournamentId: tournament.id,
        status: "FINAL",
        winnerId: { not: null },
      },
      select: {
        team1Id: true,
        team2Id: true,
        winnerId: true,
      },
    });

    // A team is eliminated if they lost any game (were team1 or team2 but not the winner)
    const eliminatedSet = new Set<string>();
    for (const game of games) {
      if (game.team1Id && game.team1Id !== game.winnerId) {
        const bracketId = ttIdToBracketId.get(game.team1Id);
        if (bracketId) eliminatedSet.add(bracketId);
      }
      if (game.team2Id && game.team2Id !== game.winnerId) {
        const bracketId = ttIdToBracketId.get(game.team2Id);
        if (bracketId) eliminatedSet.add(bracketId);
      }
    }

    return NextResponse.json({ eliminated: Array.from(eliminatedSet) });
  } catch (error) {
    console.error("Error fetching eliminated teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch eliminated teams" },
      { status: 500 }
    );
  }
}
