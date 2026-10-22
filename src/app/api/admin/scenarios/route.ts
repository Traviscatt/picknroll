import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { parsePicksData, rankEntries, scoreBracket } from "@/lib/scoring-engine";
import { loadTournamentResults, SCORED_STATUSES } from "@/lib/scoring-service";

// GET /api/admin/scenarios
// Enumerates the 8 championship scenarios:
//   Semi 1: teamA vs teamB (from R4 G1/G2 winners)
//   Semi 2: teamC vs teamD (from R4 G3/G4 winners)
//   4 possible championship matchups × 2 outcomes = 8 scenarios
export async function GET() {
  try {
    const { authorized, response } = await requireAdmin();
    if (!authorized) return response!;

    const tournament = await db.tournament.findFirst({ orderBy: { year: "desc" } });
    if (!tournament) {
      return NextResponse.json({ error: "No tournament found" }, { status: 404 });
    }

    // ── Games and final results in bracket ID space ──
    const { games: allGames, idToKey, winners: baseWinners } = await loadTournamentResults(tournament.id);

    // ── Build teamNameMap ──
    const tournamentTeams = await db.tournamentTeam.findMany({
      where: { tournamentId: tournament.id },
      select: { id: true, team: { select: { name: true } } },
    });
    const teamNameMap = new Map<string, string>();
    for (const tt of tournamentTeams) {
      teamNameMap.set(tt.id, tt.team.name);
    }

    // ── Identify the 4 Final Four teams from R4 (Elite 8) winners ──
    // Bracket structure: R4 G1 & G2 feed R5 G1, R4 G3 & G4 feed R5 G2
    // R5 G1 winner & R5 G2 winner feed R6 G1 (Championship)
    const r4Games = allGames
      .filter(g => g.round === 4 && g.status === "FINAL" && g.winnerId)
      .sort((a, b) => a.gameNumber - b.gameNumber);

    if (r4Games.length < 4) {
      return NextResponse.json({
        message: "Elite 8 not yet complete — need all 4 winners to generate scenarios.",
        scenarios: [],
        totalScenarios: 0,
      });
    }

    // Semi 1 teams: winners of R4 G1 and R4 G2 (team keys like "east-1")
    const finalist = (game: (typeof r4Games)[number], fallback: string) => ({
      id: idToKey.get(game.winnerId!) ?? game.winnerId!,
      name: teamNameMap.get(game.winnerId!) || fallback,
    });
    const semi1TeamA = finalist(r4Games[0], "Team A");
    const semi1TeamB = finalist(r4Games[1], "Team B");
    // Semi 2 teams: winners of R4 G3 and R4 G4
    const semi2TeamC = finalist(r4Games[2], "Team C");
    const semi2TeamD = finalist(r4Games[3], "Team D");

    // Make sure the Final Four / Championship game records exist
    const r5Games = allGames.filter(g => g.round === 5);
    const r6Games = allGames.filter(g => g.round === 6);
    if (r5Games.length < 2 || r6Games.length < 1) {
      return NextResponse.json({
        message: "Final Four / Championship game records not found in database.",
        scenarios: [],
        totalScenarios: 0,
      });
    }

    // ── Build the 8 scenarios ──
    // 4 championship matchups × 2 championship winners
    const semi1Options = [semi1TeamA, semi1TeamB]; // who wins semi 1
    const semi2Options = [semi2TeamC, semi2TeamD]; // who wins semi 2

    interface ChampionshipScenario {
      semi1Winner: { id: string; name: string };
      semi1Loser: { id: string; name: string };
      semi2Winner: { id: string; name: string };
      semi2Loser: { id: string; name: string };
      champion: { id: string; name: string };
      runnerUp: { id: string; name: string };
    }

    const championshipScenarios: ChampionshipScenario[] = [];
    for (const s1Winner of semi1Options) {
      const s1Loser = s1Winner.id === semi1TeamA.id ? semi1TeamB : semi1TeamA;
      for (const s2Winner of semi2Options) {
        const s2Loser = s2Winner.id === semi2TeamC.id ? semi2TeamD : semi2TeamC;
        // Championship: s1Winner vs s2Winner — 2 outcomes
        championshipScenarios.push({
          semi1Winner: s1Winner, semi1Loser: s1Loser,
          semi2Winner: s2Winner, semi2Loser: s2Loser,
          champion: s1Winner, runnerUp: s2Winner,
        });
        championshipScenarios.push({
          semi1Winner: s1Winner, semi1Loser: s1Loser,
          semi2Winner: s2Winner, semi2Loser: s2Loser,
          champion: s2Winner, runnerUp: s1Winner,
        });
      }
    }

    // ── Fetch all submitted brackets in this tournament's pools ──
    const brackets = await db.bracket.findMany({
      where: { status: { in: SCORED_STATUSES }, pool: { tournamentId: tournament.id } },
      select: { id: true, name: true, entryName: true, picksData: true, tiebreaker: true },
    });
    const bracketPicks = brackets.map((b) => ({ ...b, picks: parsePicksData(b.picksData) }));

    // ── Score each scenario ──
    const scenarios = [];

    for (let si = 0; si < championshipScenarios.length; si++) {
      const cs = championshipScenarios[si];

      // Build scenarioWinners: start with all completed games, then add R5/R6 outcomes
      const scenarioWinners = new Map(baseWinners);
      scenarioWinners.set("final-four-r5-g1", cs.semi1Winner.id);
      scenarioWinners.set("final-four-r5-g2", cs.semi2Winner.id);
      scenarioWinners.set("championship-r6-g1", cs.champion.id);

      // Score each bracket
      const bracketScores = bracketPicks.map((bracket) => {
        const { total, bonus } = scoreBracket(bracket.picks, scenarioWinners);
        return {
          id: bracket.id,
          name: bracket.name || "",
          entryName: bracket.entryName || "",
          totalScore: total,
          bonusScore: bonus,
          combined: total + bonus,
          score: total + bonus,
          tiebreaker: bracket.tiebreaker,
        };
      });

      // The championship total isn't known in a hypothetical scenario, so equal scores share a rank
      const top10 = rankEntries(bracketScores, null)
        .slice(0, 10)
        .map(({ rank, id, name, entryName, totalScore, bonusScore, combined }) => ({
          rank, id, name, entryName, totalScore, bonusScore, combined,
        }));

      scenarios.push({
        scenarioIndex: si + 1,
        championship: `${cs.semi1Winner.name} vs ${cs.semi2Winner.name}`,
        champion: cs.champion.name,
        semi1: `${semi1TeamA.name} vs ${semi1TeamB.name}`,
        semi1Winner: cs.semi1Winner.name,
        semi2: `${semi2TeamC.name} vs ${semi2TeamD.name}`,
        semi2Winner: cs.semi2Winner.name,
        top10,
      });
    }

    return NextResponse.json({
      finalFourTeams: {
        semi1: { team1: semi1TeamA.name, team2: semi1TeamB.name },
        semi2: { team1: semi2TeamC.name, team2: semi2TeamD.name },
      },
      totalScenarios: scenarios.length,
      scenarios,
    });
  } catch (error) {
    console.error("Error computing scenarios:", error);
    return NextResponse.json(
      { error: "Failed to compute scenarios" },
      { status: 500 }
    );
  }
}
