import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { SCORING_RULES, FINAL_FOUR_BONUS, FINAL_FOUR_ROUND, FINAL_FOUR_GAMES_COUNT } from "@/lib/scoring";

interface VirtualGame {
  dbGameId: string;
  round: number;
  gameNumber: number;
  region: string | null;
  team1Id: string;
  team1Name: string;
  team2Id: string;
  team2Name: string;
}

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

    // Build teamIdMap and reverse map (tournamentTeamId -> name)
    const tournamentTeams = await db.tournamentTeam.findMany({
      where: { tournamentId: tournament.id },
      select: { id: true, seed: true, region: true, team: { select: { name: true } } },
    });
    const teamIdMap = new Map<string, string>();
    const teamNameMap = new Map<string, string>();
    for (const tt of tournamentTeams) {
      const key = `${tt.region.toLowerCase()}-${tt.seed}`;
      teamIdMap.set(key, tt.id);
      teamNameMap.set(tt.id, tt.team.name);
    }

    // Identify non-FINAL games
    const unfinishedGames = allGames.filter(g => g.status !== "FINAL");

    if (unfinishedGames.length === 0) {
      return NextResponse.json({
        message: "All games are complete — no scenarios to simulate.",
        scenarios: [],
        remainingGames: [],
        totalScenarios: 0,
      });
    }

    // Build virtual games list — resolve teams for games with NULL team slots
    // by walking the bracket structure: nextGameNumber = ceil(prevGameNumber / 2)
    // Group all games by round for lookup
    const gamesByRoundAndNumber = new Map<string, typeof allGames[0]>();
    for (const g of allGames) {
      gamesByRoundAndNumber.set(`${g.round}-${g.gameNumber}`, g);
    }

    // Recursively resolve feeder team for a game slot
    function resolveTeamForSlot(round: number, gameNumber: number, slot: "team1" | "team2"): { id: string; name: string } | null {
      const game = gamesByRoundAndNumber.get(`${round}-${gameNumber}`);
      if (!game) return null;

      // If this game is FINAL, return its winner
      if (game.status === "FINAL" && game.winnerId) {
        return { id: game.winnerId, name: teamNameMap.get(game.winnerId) || game.winner?.team?.name || "Unknown" };
      }

      // If teams are already assigned, return the requested slot
      if (slot === "team1" && game.team1Id) {
        return { id: game.team1Id, name: teamNameMap.get(game.team1Id) || game.team1?.team?.name || "Unknown" };
      }
      if (slot === "team2" && game.team2Id) {
        return { id: game.team2Id, name: teamNameMap.get(game.team2Id) || game.team2?.team?.name || "Unknown" };
      }

      // Look at the feeder games from the previous round
      // team1 comes from the lower-numbered feeder: (gameNumber * 2 - 1)
      // team2 comes from the higher-numbered feeder: (gameNumber * 2)
      const prevRound = round - 1;
      if (prevRound < 1) return null;
      const feederGameNum = slot === "team1" ? gameNumber * 2 - 1 : gameNumber * 2;
      const feederGame = gamesByRoundAndNumber.get(`${prevRound}-${feederGameNum}`);
      if (feederGame && feederGame.status === "FINAL" && feederGame.winnerId) {
        return { id: feederGame.winnerId, name: teamNameMap.get(feederGame.winnerId) || feederGame.winner?.team?.name || "Unknown" };
      }
      return null;
    }

    // Build the list of simulatable games (non-FINAL where we can resolve both teams)
    const virtualGames: VirtualGame[] = [];
    for (const g of unfinishedGames) {
      const t1 = g.team1Id
        ? { id: g.team1Id, name: g.team1?.team?.name || "Unknown" }
        : resolveTeamForSlot(g.round, g.gameNumber, "team1");
      const t2 = g.team2Id
        ? { id: g.team2Id, name: g.team2?.team?.name || "Unknown" }
        : resolveTeamForSlot(g.round, g.gameNumber, "team2");

      if (t1 && t2) {
        virtualGames.push({
          dbGameId: g.id,
          round: g.round,
          gameNumber: g.gameNumber,
          region: g.region,
          team1Id: t1.id,
          team1Name: t1.name,
          team2Id: t2.id,
          team2Name: t2.name,
        });
      }
    }

    // Separate into rounds: we need to handle cascading (R5 winners feed R6)
    // Sort by round so we process earlier rounds first
    virtualGames.sort((a, b) => a.round - b.round || a.gameNumber - b.gameNumber);

    // Find games whose teams depend on outcomes of other virtual games
    // R6 championship teams come from R5 winners, so R6 is dependent
    const independentGames = virtualGames.filter(vg =>
      !virtualGames.some(other => other.round < vg.round)
    );
    const dependentGames = virtualGames.filter(vg =>
      virtualGames.some(other => other.round < vg.round)
    );

    // If only independent games remain (no cascading), simple 2^n approach
    // If there are dependent games, we need cascading simulation
    // In practice: R5 games are independent, R6 depends on R5 outcomes

    // Total combos = 2^(number of independent games) * 2^(number of dependent games)
    // But dependent game matchups change based on independent outcomes
    // So we iterate: for each combo of independent games, determine dependent game matchups,
    // then for each combo of dependent games, score everything

    const numIndependentCombos = Math.pow(2, independentGames.length);

    const scenarios = [];
    let scenarioIndex = 0;

    // Collect remaining games info (only independent ones for display — dependent ones vary)
    const remainingGamesInfo = virtualGames.map(vg => ({
      id: vg.dbGameId,
      round: vg.round,
      gameNumber: vg.gameNumber,
      region: vg.region,
      team1: { id: vg.team1Id, name: vg.team1Name },
      team2: { id: vg.team2Id, name: vg.team2Name },
    }));

    // Fetch all submitted brackets once
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
    for (const g of allGames) {
      if (g.winnerId && g.status === "FINAL") baseWinners.set(g.id, g.winnerId);
    }

    for (let indepCombo = 0; indepCombo < numIndependentCombos; indepCombo++) {
      // Determine winners of independent games
      const indepWinners = new Map<string, { id: string; name: string }>();
      for (let gi = 0; gi < independentGames.length; gi++) {
        const vg = independentGames[gi];
        const team1Wins = ((indepCombo >> gi) & 1) === 0;
        indepWinners.set(vg.dbGameId, team1Wins
          ? { id: vg.team1Id, name: vg.team1Name }
          : { id: vg.team2Id, name: vg.team2Name }
        );
      }

      // Resolve dependent games' matchups based on independent outcomes
      const resolvedDependentGames: VirtualGame[] = [];
      for (const dg of dependentGames) {
        // Find who feeds into this game
        const feederNum1 = dg.gameNumber * 2 - 1;
        const feederNum2 = dg.gameNumber * 2;
        const prevRound = dg.round - 1;

        // Check if feeders are among independent games
        const feeder1 = virtualGames.find(vg => vg.round === prevRound && vg.gameNumber === feederNum1);
        const feeder2 = virtualGames.find(vg => vg.round === prevRound && vg.gameNumber === feederNum2);

        let t1: { id: string; name: string } | null = null;
        let t2: { id: string; name: string } | null = null;

        if (feeder1) {
          const w = indepWinners.get(feeder1.dbGameId);
          if (w) t1 = w;
        }
        if (!t1) {
          // Feeder is a completed game
          const feederGame = gamesByRoundAndNumber.get(`${prevRound}-${feederNum1}`);
          if (feederGame?.winnerId) t1 = { id: feederGame.winnerId, name: teamNameMap.get(feederGame.winnerId) || "Unknown" };
        }

        if (feeder2) {
          const w = indepWinners.get(feeder2.dbGameId);
          if (w) t2 = w;
        }
        if (!t2) {
          const feederGame = gamesByRoundAndNumber.get(`${prevRound}-${feederNum2}`);
          if (feederGame?.winnerId) t2 = { id: feederGame.winnerId, name: teamNameMap.get(feederGame.winnerId) || "Unknown" };
        }

        if (t1 && t2) {
          resolvedDependentGames.push({
            ...dg,
            team1Id: t1.id,
            team1Name: t1.name,
            team2Id: t2.id,
            team2Name: t2.name,
          });
        }
      }

      const numDepCombos = Math.pow(2, resolvedDependentGames.length);

      for (let depCombo = 0; depCombo < numDepCombos; depCombo++) {
        scenarioIndex++;
        const scenarioWinners = new Map(baseWinners);
        const outcomeLabel: { round: number; region: string | null; team1: string; team2: string; winner: string }[] = [];

        // Apply independent game outcomes
        for (const [gameId, winner] of indepWinners) {
          scenarioWinners.set(gameId, winner.id);
        }
        for (let gi = 0; gi < independentGames.length; gi++) {
          const vg = independentGames[gi];
          const winner = indepWinners.get(vg.dbGameId)!;
          outcomeLabel.push({
            round: vg.round,
            region: vg.region,
            team1: vg.team1Name,
            team2: vg.team2Name,
            winner: winner.name,
          });
        }

        // Apply dependent game outcomes
        for (let di = 0; di < resolvedDependentGames.length; di++) {
          const dg = resolvedDependentGames[di];
          const team1Wins = ((depCombo >> di) & 1) === 0;
          const winnerId = team1Wins ? dg.team1Id : dg.team2Id;
          const winnerName = team1Wins ? dg.team1Name : dg.team2Name;
          scenarioWinners.set(dg.dbGameId, winnerId);
          outcomeLabel.push({
            round: dg.round,
            region: dg.region,
            team1: dg.team1Name,
            team2: dg.team2Name,
            winner: winnerName,
          });
        }

        // Score each bracket under this scenario
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

        // Sort by combined score desc, take top 10
        bracketScores.sort((a, b) => b.combined - a.combined);
        const top10 = bracketScores.slice(0, 10).map((b, idx) => ({
          rank: idx + 1,
          ...b,
        }));

        scenarios.push({
          scenarioIndex,
          outcomes: outcomeLabel,
          top10,
        });
      }
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
