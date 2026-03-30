import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { SCORING_RULES, FINAL_FOUR_BONUS, FINAL_FOUR_ROUND, FINAL_FOUR_GAMES_COUNT } from "@/lib/scoring";

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

    // ── Fetch all games ──
    const allGames = await db.game.findMany({
      where: { tournamentId: tournament.id },
      include: {
        team1: { include: { team: true } },
        team2: { include: { team: true } },
        winner: { include: { team: true } },
      },
      orderBy: [{ round: "asc" }, { gameNumber: "asc" }],
    });

    // ── Build bracketGameMap (for picksData scoring) ──
    const bracketGameMap = new Map<string, typeof allGames[0]>();
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
        let bracketId: string;
        if (g.region && g.round <= 4) {
          bracketId = `${g.region}-r${g.round}-g${i + 1}`;
        } else if (g.round === 5) {
          bracketId = `final-four-r5-g${g.gameNumber}`;
        } else {
          bracketId = `championship-r6-g${g.gameNumber}`;
        }
        bracketGameMap.set(bracketId, g);
      }
    }

    // ── Build teamIdMap + teamNameMap ──
    const tournamentTeams = await db.tournamentTeam.findMany({
      where: { tournamentId: tournament.id },
      select: { id: true, seed: true, region: true, team: { select: { name: true } } },
    });
    const teamIdMap = new Map<string, string>();
    const teamNameMap = new Map<string, string>();
    for (const tt of tournamentTeams) {
      teamIdMap.set(`${tt.region.toLowerCase()}-${tt.seed}`, tt.id);
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

    // Semi 1 teams: winners of R4 G1 and R4 G2
    const semi1TeamA = { id: r4Games[0].winnerId!, name: teamNameMap.get(r4Games[0].winnerId!) || r4Games[0].winner?.team?.name || "Team A" };
    const semi1TeamB = { id: r4Games[1].winnerId!, name: teamNameMap.get(r4Games[1].winnerId!) || r4Games[1].winner?.team?.name || "Team B" };
    // Semi 2 teams: winners of R4 G3 and R4 G4
    const semi2TeamC = { id: r4Games[2].winnerId!, name: teamNameMap.get(r4Games[2].winnerId!) || r4Games[2].winner?.team?.name || "Team C" };
    const semi2TeamD = { id: r4Games[3].winnerId!, name: teamNameMap.get(r4Games[3].winnerId!) || r4Games[3].winner?.team?.name || "Team D" };

    // Find the R5 and R6 game DB records (needed to set scenarioWinners by game ID)
    const r5Games = allGames.filter(g => g.round === 5).sort((a, b) => a.gameNumber - b.gameNumber);
    const r6Games = allGames.filter(g => g.round === 6);
    if (r5Games.length < 2 || r6Games.length < 1) {
      return NextResponse.json({
        message: "Final Four / Championship game records not found in database.",
        scenarios: [],
        totalScenarios: 0,
      });
    }
    const r5g1 = r5Games[0]; // Semi 1: teamA vs teamB
    const r5g2 = r5Games[1]; // Semi 2: teamC vs teamD
    const r6g1 = r6Games[0]; // Championship

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

    // ── Base winners from completed games ──
    const baseWinners = new Map<string, string>();
    for (const g of allGames) {
      if (g.winnerId && g.status === "FINAL") baseWinners.set(g.id, g.winnerId);
    }

    // ── Fetch all submitted brackets ──
    const brackets = await db.bracket.findMany({
      where: { status: { in: ["SUBMITTED", "PAID"] } },
      select: {
        id: true,
        name: true,
        entryName: true,
        picksData: true,
        picks: { include: { game: true } },
      },
    });

    // ── Score each scenario ──
    const scenarios = [];

    for (let si = 0; si < championshipScenarios.length; si++) {
      const cs = championshipScenarios[si];

      // Build scenarioWinners: start with all completed games, then add R5/R6 outcomes
      const scenarioWinners = new Map(baseWinners);
      scenarioWinners.set(r5g1.id, cs.semi1Winner.id);
      scenarioWinners.set(r5g2.id, cs.semi2Winner.id);
      scenarioWinners.set(r6g1.id, cs.champion.id);

      // Score each bracket
      const bracketScores: { id: string; name: string; entryName: string; totalScore: number; bonusScore: number; combined: number }[] = [];

      for (const bracket of brackets) {
        let totalScore = 0;
        let bonusScore = 0;

        // Score from formal Pick records
        if (bracket.picks.length > 0) {
          const finalFourPicks: { gameId: string; teamId: string; choiceRank: number }[] = [];

          for (const pick of bracket.picks) {
            const winnerId = scenarioWinners.get(pick.gameId);
            if (!winnerId) continue;

            const isCorrect = pick.teamId === winnerId;
            const rule = SCORING_RULES.find(r => r.round === pick.game.round);
            if (!rule) continue;

            const choiceIndex = pick.choiceRank - 1;
            const points = isCorrect && choiceIndex < rule.pointsPerChoice.length
              ? rule.pointsPerChoice[choiceIndex] : 0;
            totalScore += points;

            if (pick.game.round === FINAL_FOUR_ROUND && pick.choiceRank === 1) {
              finalFourPicks.push({ gameId: pick.gameId, teamId: pick.teamId, choiceRank: pick.choiceRank });
            }
          }

          const finalFourGames = allGames.filter(g => g.round === FINAL_FOUR_ROUND);
          if (finalFourGames.length === FINAL_FOUR_GAMES_COUNT && finalFourPicks.length === FINAL_FOUR_GAMES_COUNT) {
            let allCorrect = true;
            for (const ffGame of finalFourGames) {
              const wId = scenarioWinners.get(ffGame.id) || ffGame.winnerId;
              const pick = finalFourPicks.find(p => p.gameId === ffGame.id);
              if (!pick || pick.choiceRank !== 1 || pick.teamId !== wId) {
                allCorrect = false;
                break;
              }
            }
            if (allCorrect) bonusScore = FINAL_FOUR_BONUS;
          }
        }

        // Score from picksData JSON
        if (bracket.picks.length === 0 && bracket.picksData) {
          try {
            const picksArray = JSON.parse(bracket.picksData);
            const picksDataFinalFour: { gameId: string; teamId: string }[] = [];

            for (const pickData of picksArray) {
              if (!pickData.gameId || !pickData.choices) continue;
              const game = bracketGameMap.get(pickData.gameId);
              if (!game) continue;

              const winnerId = scenarioWinners.get(game.id);
              if (!winnerId) continue;

              const rule = SCORING_RULES.find(r => r.round === game.round);
              if (!rule) continue;

              if (game.round === FINAL_FOUR_ROUND && pickData.choices[0]) {
                const firstChoiceId = teamIdMap.get(pickData.choices[0]) || pickData.choices[0];
                picksDataFinalFour.push({ gameId: game.id, teamId: firstChoiceId });
              }

              for (let rank = 0; rank < pickData.choices.length; rank++) {
                if (rank >= rule.pointsPerChoice.length) break;
                const pickedTeamId = teamIdMap.get(pickData.choices[rank]) || pickData.choices[rank];
                if (pickedTeamId === winnerId) {
                  totalScore += rule.pointsPerChoice[rank];
                }
              }
            }

            const pdFinalFourGames = allGames.filter(g => g.round === FINAL_FOUR_ROUND);
            if (pdFinalFourGames.length === FINAL_FOUR_GAMES_COUNT && picksDataFinalFour.length === FINAL_FOUR_GAMES_COUNT) {
              let allCorrect = true;
              for (const ffGame of pdFinalFourGames) {
                const wId = scenarioWinners.get(ffGame.id) || ffGame.winnerId;
                const pick = picksDataFinalFour.find(p => p.gameId === ffGame.id);
                if (!pick || pick.teamId !== wId) {
                  allCorrect = false;
                  break;
                }
              }
              if (allCorrect) bonusScore = FINAL_FOUR_BONUS;
            }
          } catch {
            // skip malformed picksData
          }
        }

        const combined = totalScore + bonusScore;
        bracketScores.push({
          id: bracket.id,
          name: bracket.name || "",
          entryName: bracket.entryName || "",
          totalScore,
          bonusScore,
          combined,
        });
      }

      bracketScores.sort((a, b) => b.combined - a.combined);
      const top10 = bracketScores.slice(0, 10).map((b, idx) => ({
        rank: idx + 1,
        ...b,
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
