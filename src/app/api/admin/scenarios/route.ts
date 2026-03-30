import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { SCORING_RULES, FINAL_FOUR_BONUS, FINAL_FOUR_ROUND, FINAL_FOUR_GAMES_COUNT } from "@/lib/scoring";

// GET /api/admin/scenarios - Compute top 10 for every possible remaining-game outcome
export async function GET() {
  try {
    const { authorized, response } = await requireAdmin();
    if (!authorized) return response!;

    const tournament = await db.tournament.findFirst({
      orderBy: { year: "desc" },
    });
    if (!tournament) {
      return NextResponse.json({ error: "No tournament found" }, { status: 404 });
    }

    // Fetch all games
    const allGames = await db.game.findMany({
      where: { tournamentId: tournament.id },
      include: {
        team1: { include: { team: true } },
        team2: { include: { team: true } },
        winner: { include: { team: true } },
      },
      orderBy: [{ round: "asc" }, { gameNumber: "asc" }],
    });

    const completedGames = allGames.filter(g => g.winnerId && g.status === "FINAL");

    // Remaining games that have both teams set
    const remainingGames = allGames.filter(
      g => g.status !== "FINAL" && g.team1Id && g.team2Id
    );

    if (remainingGames.length === 0) {
      return NextResponse.json({
        message: "No remaining games to simulate",
        scenarios: [],
        remainingGames: [],
        totalScenarios: 0,
      });
    }

    // Build bracketGameMap (same logic as score route)
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

    // Build teamIdMap
    const tournamentTeams = await db.tournamentTeam.findMany({
      where: { tournamentId: tournament.id },
      select: { id: true, seed: true, region: true },
    });
    const teamIdMap = new Map<string, string>();
    for (const tt of tournamentTeams) {
      const key = `${tt.region.toLowerCase()}-${tt.seed}`;
      teamIdMap.set(key, tt.id);
    }

    // Fetch all submitted brackets
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

    // Base winners from completed games
    const baseWinners = new Map<string, string>();
    for (const g of completedGames) {
      if (g.winnerId) baseWinners.set(g.id, g.winnerId);
    }

    // Generate all outcome combinations (2^n)
    const numCombinations = Math.pow(2, remainingGames.length);

    const remainingGamesInfo = remainingGames.map(g => ({
      id: g.id,
      round: g.round,
      gameNumber: g.gameNumber,
      region: g.region,
      team1: { id: g.team1Id!, name: g.team1?.team?.name || "TBD" },
      team2: { id: g.team2Id!, name: g.team2?.team?.name || "TBD" },
    }));

    const scenarios = [];

    for (let combo = 0; combo < numCombinations; combo++) {
      const scenarioWinners = new Map(baseWinners);
      const outcomeLabel: { gameId: string; round: number; region: string | null; winner: string; winnerId: string }[] = [];

      for (let gi = 0; gi < remainingGames.length; gi++) {
        const game = remainingGames[gi];
        const team1Wins = ((combo >> gi) & 1) === 0;
        const winnerId = team1Wins ? game.team1Id! : game.team2Id!;
        const winnerName = team1Wins
          ? (game.team1?.team?.name || "Team 1")
          : (game.team2?.team?.name || "Team 2");
        scenarioWinners.set(game.id, winnerId);
        outcomeLabel.push({
          gameId: game.id,
          round: game.round,
          region: game.region,
          winner: winnerName,
          winnerId,
        });
      }

      // All games treated as final for this scenario (for bonus check)
      const scenarioAllGames = allGames.map(g => ({
        ...g,
        winnerId: scenarioWinners.get(g.id) || g.winnerId,
      }));

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

          const finalFourGames = scenarioAllGames.filter(g => g.round === FINAL_FOUR_ROUND);
          if (finalFourGames.length === FINAL_FOUR_GAMES_COUNT && finalFourPicks.length === FINAL_FOUR_GAMES_COUNT) {
            let allCorrect = true;
            for (const ffGame of finalFourGames) {
              const pick = finalFourPicks.find(p => p.gameId === ffGame.id);
              if (!pick || pick.choiceRank !== 1 || pick.teamId !== ffGame.winnerId) {
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

            const pdFinalFourGames = scenarioAllGames.filter(g => g.round === FINAL_FOUR_ROUND);
            if (pdFinalFourGames.length === FINAL_FOUR_GAMES_COUNT && picksDataFinalFour.length === FINAL_FOUR_GAMES_COUNT) {
              let allCorrect = true;
              for (const ffGame of pdFinalFourGames) {
                const pick = picksDataFinalFour.find(p => p.gameId === ffGame.id);
                if (!pick || pick.teamId !== ffGame.winnerId) {
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

      // Sort by combined score desc, take top 10
      bracketScores.sort((a, b) => b.combined - a.combined);
      const top10 = bracketScores.slice(0, 10).map((b, idx) => ({
        rank: idx + 1,
        ...b,
      }));

      scenarios.push({
        scenarioIndex: combo + 1,
        outcomes: outcomeLabel,
        top10,
      });
    }

    return NextResponse.json({
      remainingGames: remainingGamesInfo,
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
