import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { SCORING_RULES, FINAL_FOUR_BONUS, FINAL_FOUR_ROUND, FINAL_FOUR_GAMES_COUNT } from "@/lib/scoring";

// POST /api/admin/score - Recalculate all bracket scores based on game results
export async function POST() {
  try {
    const { authorized, response } = await requireAdmin();
    if (!authorized) return response!;

    // Get the current tournament (latest year)
    const tournament = await db.tournament.findFirst({
      orderBy: { year: "desc" },
    });

    if (!tournament) {
      return NextResponse.json({
        message: "No tournament found.",
        bracketsUpdated: 0,
      });
    }

    // Fetch ALL tournament games to build the bracket gameId mapping
    const allGames = await db.game.findMany({
      where: { tournamentId: tournament.id },
      select: {
        id: true,
        round: true,
        gameNumber: true,
        region: true,
        winnerId: true,
        team1Score: true,
        team2Score: true,
        status: true,
      },
    });

    // Only completed games count for scoring
    const games = allGames.filter(g => g.winnerId && g.status === "FINAL");

    // Build a map from "east-1" style IDs to TournamentTeam IDs for picksData scoring
    const tournamentTeams = await db.tournamentTeam.findMany({
      where: { tournamentId: tournament.id },
      select: { id: true, seed: true, region: true },
    });
    const teamIdMap = new Map<string, string>(); // "east-1" -> TournamentTeam.id
    for (const tt of tournamentTeams) {
      const key = `${tt.region.toLowerCase()}-${tt.seed}`;
      teamIdMap.set(key, tt.id);
    }

    // Build a map from bracket-style gameId (e.g. "East-r1-g1") to DB game
    // Group all games by round+region, sort by gameNumber, assign per-region indices
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

    if (games.length === 0) {
      return NextResponse.json({
        message: "No completed games found. Enter results first.",
        bracketsUpdated: 0,
      });
    }

    // Build a map of gameId -> winnerId for quick lookup
    const gameWinners = new Map<string, string>();
    for (const game of games) {
      if (game.winnerId) {
        gameWinners.set(game.id, game.winnerId);
      }
    }

    // Get all submitted brackets with their picks
    const brackets = await db.bracket.findMany({
      where: {
        status: { in: ["SUBMITTED", "PAID"] },
      },
      include: {
        picks: {
          include: {
            game: true,
          },
        },
      },
    });

    let bracketsUpdated = 0;

    for (const bracket of brackets) {
      let totalScore = 0;
      let bonusScore = 0;
      
      // Track Final Four picks for bonus calculation
      const finalFourPicks: { gameId: string; teamId: string; choiceRank: number }[] = [];

      // Score each pick
      for (const pick of bracket.picks) {
        const winnerId = gameWinners.get(pick.gameId);
        if (!winnerId) continue; // Game not yet completed

        const isCorrect = pick.teamId === winnerId;
        const rule = SCORING_RULES.find((r) => r.round === pick.game.round);

        if (!rule) continue;

        const choiceIndex = pick.choiceRank - 1;
        const points = isCorrect && choiceIndex < rule.pointsPerChoice.length
          ? rule.pointsPerChoice[choiceIndex]
          : 0;

        // Update the pick record
        await db.pick.update({
          where: { id: pick.id },
          data: {
            correct: isCorrect,
            pointsEarned: points,
          },
        });

        totalScore += points;
        
        // Track Final Four picks for bonus
        if (pick.game.round === FINAL_FOUR_ROUND) {
          finalFourPicks.push({
            gameId: pick.gameId,
            teamId: pick.teamId,
            choiceRank: pick.choiceRank,
          });
        }
      }
      
      // Calculate Final Four bonus: +10 if all FF picks correct with 1st choice
      const finalFourGames = games.filter(g => g.round === FINAL_FOUR_ROUND);
      if (finalFourGames.length === FINAL_FOUR_GAMES_COUNT && finalFourPicks.length === FINAL_FOUR_GAMES_COUNT) {
        let allFirstChoiceCorrect = true;
        for (const ffGame of finalFourGames) {
          const pick = finalFourPicks.find(p => p.gameId === ffGame.id);
          if (!pick || pick.choiceRank !== 1 || pick.teamId !== ffGame.winnerId) {
            allFirstChoiceCorrect = false;
            break;
          }
        }
        if (allFirstChoiceCorrect) {
          bonusScore = FINAL_FOUR_BONUS;
          totalScore += bonusScore;
        }
      }

      // Also score from picksData JSON if no formal Pick records exist
      if (bracket.picks.length === 0 && bracket.picksData) {
        try {
          const picksArray = JSON.parse(bracket.picksData);
          // picksData format: [{gameId, choices: [teamId1, teamId2, ...]}]
          for (const pickData of picksArray) {
            if (!pickData.gameId || !pickData.choices) continue;

            // Find the matching game using the bracket gameId map
            const game = bracketGameMap.get(pickData.gameId);

            if (!game || !game.winnerId) continue;

            const rule = SCORING_RULES.find((r) => r.round === game.round);
            if (!rule) continue;

            // Check each ranked choice — resolve "east-1" style IDs to TournamentTeam IDs
            for (let rank = 0; rank < pickData.choices.length; rank++) {
              if (rank >= rule.pointsPerChoice.length) break;
              const pickedTeamId = teamIdMap.get(pickData.choices[rank]) || pickData.choices[rank];
              if (pickedTeamId === game.winnerId) {
                totalScore += rule.pointsPerChoice[rank];
              }
            }
          }
        } catch {
          console.error(`Failed to parse picksData for bracket ${bracket.id}`);
        }
      }

      // Update bracket total score and bonus
      await db.bracket.update({
        where: { id: bracket.id },
        data: { totalScore, bonusScore },
      });

      bracketsUpdated++;
    }

    return NextResponse.json({
      message: `Scores recalculated for ${bracketsUpdated} brackets.`,
      bracketsUpdated,
      gamesScored: games.length,
    });
  } catch (error) {
    console.error("Error calculating scores:", error);
    return NextResponse.json(
      { error: "Failed to calculate scores" },
      { status: 500 }
    );
  }
}
