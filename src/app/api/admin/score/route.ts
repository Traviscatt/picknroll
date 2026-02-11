import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { SCORING_RULES } from "@/lib/scoring";

// POST /api/admin/score - Recalculate all bracket scores based on game results
export async function POST() {
  try {
    const { authorized, response } = await requireAdmin();
    if (!authorized) return response;

    // Get all completed games with winners
    const games = await db.game.findMany({
      where: {
        winnerId: { not: null },
        status: "FINAL",
      },
      select: {
        id: true,
        round: true,
        gameNumber: true,
        region: true,
        winnerId: true,
        team1Score: true,
        team2Score: true,
      },
    });

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
      }

      // Also score from picksData JSON if no formal Pick records exist
      if (bracket.picks.length === 0 && bracket.picksData) {
        try {
          const picksArray = JSON.parse(bracket.picksData);
          // picksData format: [{gameId, choices: [teamId1, teamId2, ...]}]
          for (const pickData of picksArray) {
            if (!pickData.gameId || !pickData.choices) continue;

            // Find the matching game
            const game = games.find((g) => {
              // Match by composite key: region-round-game pattern
              const gameKey = g.region
                ? `${g.region}-r${g.round}-g${g.gameNumber}`
                : g.round === 5
                ? `final-four-r5-g${g.gameNumber}`
                : `championship-r6-g${g.gameNumber}`;
              return gameKey === pickData.gameId;
            });

            if (!game || !game.winnerId) continue;

            const rule = SCORING_RULES.find((r) => r.round === game.round);
            if (!rule) continue;

            // Check each ranked choice
            for (let rank = 0; rank < pickData.choices.length; rank++) {
              if (rank >= rule.pointsPerChoice.length) break;
              if (pickData.choices[rank] === game.winnerId) {
                totalScore += rule.pointsPerChoice[rank];
              }
            }
          }
        } catch {
          console.error(`Failed to parse picksData for bracket ${bracket.id}`);
        }
      }

      // Update bracket total score
      await db.bracket.update({
        where: { id: bracket.id },
        data: { totalScore },
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
