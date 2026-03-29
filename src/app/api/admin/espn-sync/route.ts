import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { SCORING_RULES, FINAL_FOUR_BONUS, FINAL_FOUR_ROUND, FINAL_FOUR_GAMES_COUNT } from "@/lib/scoring";

const ESPN_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball";

// POST /api/admin/espn-sync - Pull results from ESPN and auto-score brackets
export async function POST(request: Request) {
  try {
    const { authorized, response } = await requireAdmin();
    if (!authorized) return response!;

    // Get the current tournament
    const tournament = await db.tournament.findFirst({
      orderBy: { year: "desc" },
    });

    if (!tournament) {
      return NextResponse.json({ error: "No tournament found" }, { status: 404 });
    }

    // Build ESPN ID -> TournamentTeam ID map
    const tournamentTeams = await db.tournamentTeam.findMany({
      where: { tournamentId: tournament.id },
      include: { team: true },
    });

    const espnToTournamentTeam = new Map<string, string>(); // ESPN team ID -> TournamentTeam.id
    for (const tt of tournamentTeams) {
      if (tt.team.espnId) {
        espnToTournamentTeam.set(tt.team.espnId, tt.id);
      }
    }

    // Fetch ESPN scoreboard for tournament dates
    const body = await request.json().catch(() => ({}));
    const dates = body.dates || getTournamentDates(tournament.startDate, tournament.endDate);

    let gamesUpdated = 0;
    let gamesFound = 0;

    for (const date of dates) {
      const url = `${ESPN_BASE_URL}/scoreboard?dates=${date}&limit=100&groups=100`;

      let espnData;
      try {
        const espnResponse = await fetch(url, { cache: "no-store" });
        if (!espnResponse.ok) continue;
        espnData = await espnResponse.json();
      } catch {
        console.error(`Failed to fetch ESPN data for date ${date}`);
        continue;
      }

      const events = espnData.events || [];
      gamesFound += events.length;

      for (const event of events) {
        const competition = event.competitions?.[0];
        if (!competition) continue;

        const isComplete = event.status?.type?.completed === true;
        if (!isComplete) continue;

        // Get the two teams' ESPN IDs
        const competitors = competition.competitors || [];
        if (competitors.length !== 2) continue;

        const espnTeam1Id = competitors[0]?.team?.id || competitors[0]?.id;
        const espnTeam2Id = competitors[1]?.team?.id || competitors[1]?.id;

        const tt1Id = espnToTournamentTeam.get(espnTeam1Id);
        const tt2Id = espnToTournamentTeam.get(espnTeam2Id);

        if (!tt1Id || !tt2Id) continue; // Teams not in our tournament

        // Determine winner
        const winner1 = competitors[0]?.winner === true;
        const winner2 = competitors[1]?.winner === true;
        const winnerTtId = winner1 ? tt1Id : winner2 ? tt2Id : null;
        if (!winnerTtId) continue;

        const score1 = parseInt(competitors[0]?.score) || 0;
        const score2 = parseInt(competitors[1]?.score) || 0;

        // Find the DB game that matches these two teams
        const dbGame = await db.game.findFirst({
          where: {
            tournamentId: tournament.id,
            OR: [
              { team1Id: tt1Id, team2Id: tt2Id },
              { team1Id: tt2Id, team2Id: tt1Id },
            ],
          },
        });

        if (dbGame) {
          // Update the game if not already final
          if (dbGame.status !== "FINAL" || !dbGame.winnerId) {
            const t1Score = dbGame.team1Id === tt1Id ? score1 : score2;
            const t2Score = dbGame.team1Id === tt1Id ? score2 : score1;

            await db.game.update({
              where: { id: dbGame.id },
              data: {
                winnerId: winnerTtId,
                team1Score: t1Score,
                team2Score: t2Score,
                status: "FINAL",
                espnGameId: event.id,
              },
            });
            gamesUpdated++;
          }
        } else {
          // Later-round game — find an unfilled game slot and assign teams + result
          const filled = await fillLaterRoundGame(tournament.id, tt1Id, tt2Id, winnerTtId, score1, score2, event.id);
          if (filled) gamesUpdated++;
        }
      }
    }

    // Auto-recalculate scores after syncing
    const scoreResult = await recalculateScores(tournament.id);

    return NextResponse.json({
      message: `ESPN sync complete. ${gamesUpdated} games updated, ${scoreResult.bracketsUpdated} brackets scored.`,
      gamesFound,
      gamesUpdated,
      bracketsUpdated: scoreResult.bracketsUpdated,
      gamesScored: scoreResult.gamesScored,
    });
  } catch (error) {
    console.error("ESPN sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync ESPN data" },
      { status: 500 }
    );
  }
}

// Find a later-round game without teams assigned, fill it in, and set the result
async function fillLaterRoundGame(
  tournamentId: string,
  tt1Id: string,
  tt2Id: string,
  winnerTtId: string,
  score1: number,
  score2: number,
  espnGameId: string
): Promise<boolean> {
  // Find the most recent game each team won to determine the correct next-round slot.
  // Game numbering is sequential per round (R1: 1-32, R2: 1-16, R3: 1-8, R4: 1-4, R5: 1-2, R6: 1).
  // The bracket structure means: nextRoundGameNumber = ceil(prevRoundGameNumber / 2).
  const prevGame1 = await db.game.findFirst({
    where: { tournamentId, winnerId: tt1Id, status: "FINAL" },
    orderBy: { round: "desc" },
  });
  const prevGame2 = await db.game.findFirst({
    where: { tournamentId, winnerId: tt2Id, status: "FINAL" },
    orderBy: { round: "desc" },
  });

  if (!prevGame1 || !prevGame2) return false;
  if (prevGame1.round !== prevGame2.round) return false;

  const nextRound = prevGame1.round + 1;
  const expectedGameNumber = Math.ceil(prevGame1.gameNumber / 2);

  // Verify both feeder games map to the same next-round game
  if (Math.ceil(prevGame2.gameNumber / 2) !== expectedGameNumber) return false;

  // Find the target game slot
  const targetGame = await db.game.findFirst({
    where: { tournamentId, round: nextRound, gameNumber: expectedGameNumber },
  });

  if (!targetGame || targetGame.status === "FINAL") return false;

  await db.game.update({
    where: { id: targetGame.id },
    data: {
      team1Id: tt1Id, team2Id: tt2Id, winnerId: winnerTtId,
      team1Score: score1, team2Score: score2, status: "FINAL", espnGameId,
    },
  });
  return true;
}

// Generate date strings for the tournament window (YYYYMMDD format)
function getTournamentDates(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const current = new Date(start);
  const endDate = new Date(end);
  const today = new Date();

  // Only go up to today
  const limit = today < endDate ? today : endDate;

  while (current <= limit) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");
    dates.push(`${y}${m}${d}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// Recalculate all bracket scores (inline to avoid circular API calls)
async function recalculateScores(tournamentId: string) {
  const allGames = await db.game.findMany({
    where: { tournamentId },
    select: {
      id: true, round: true, gameNumber: true, region: true,
      winnerId: true, team1Score: true, team2Score: true, status: true,
    },
  });

  const games = allGames.filter(g => g.winnerId && g.status === "FINAL");

  const tournamentTeams = await db.tournamentTeam.findMany({
    where: { tournamentId },
    select: { id: true, seed: true, region: true },
  });
  const teamIdMap = new Map<string, string>();
  for (const tt of tournamentTeams) {
    teamIdMap.set(`${tt.region.toLowerCase()}-${tt.seed}`, tt.id);
  }

  // Build bracket gameId map
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

  if (games.length === 0) return { bracketsUpdated: 0, gamesScored: 0 };

  const gameWinners = new Map<string, string>();
  for (const game of games) {
    if (game.winnerId) gameWinners.set(game.id, game.winnerId);
  }

  const brackets = await db.bracket.findMany({
    where: { status: { in: ["SUBMITTED", "PAID"] } },
    include: { picks: { include: { game: true } } },
  });

  let bracketsUpdated = 0;

  for (const bracket of brackets) {
    let totalScore = 0;
    let bonusScore = 0;
    const finalFourPicks: { gameId: string; teamId: string; choiceRank: number }[] = [];

    for (const pick of bracket.picks) {
      const winnerId = gameWinners.get(pick.gameId);
      if (!winnerId) continue;

      const isCorrect = pick.teamId === winnerId;
      const rule = SCORING_RULES.find((r) => r.round === pick.game.round);
      if (!rule) continue;

      const choiceIndex = pick.choiceRank - 1;
      const points = isCorrect && choiceIndex < rule.pointsPerChoice.length
        ? rule.pointsPerChoice[choiceIndex] : 0;

      await db.pick.update({
        where: { id: pick.id },
        data: { correct: isCorrect, pointsEarned: points },
      });

      totalScore += points;

      if (pick.game.round === FINAL_FOUR_ROUND && pick.choiceRank === 1) {
        finalFourPicks.push({ gameId: pick.gameId, teamId: pick.teamId, choiceRank: pick.choiceRank });
      }
    }

    const finalFourGames = games.filter(g => g.round === FINAL_FOUR_ROUND);
    if (finalFourGames.length === FINAL_FOUR_GAMES_COUNT && finalFourPicks.length === FINAL_FOUR_GAMES_COUNT) {
      let allCorrect = true;
      for (const ffGame of finalFourGames) {
        const pick = finalFourPicks.find(p => p.gameId === ffGame.id);
        if (!pick || pick.choiceRank !== 1 || pick.teamId !== ffGame.winnerId) {
          allCorrect = false;
          break;
        }
      }
      if (allCorrect) {
        bonusScore = FINAL_FOUR_BONUS;
        totalScore += bonusScore;
      }
    }

    if (bracket.picks.length === 0 && bracket.picksData) {
      try {
        const picksArray = JSON.parse(bracket.picksData);
        for (const pickData of picksArray) {
          if (!pickData.gameId || !pickData.choices) continue;
          const game = bracketGameMap.get(pickData.gameId);
          if (!game || !game.winnerId) continue;

          const rule = SCORING_RULES.find((r) => r.round === game.round);
          if (!rule) continue;

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

    await db.bracket.update({
      where: { id: bracket.id },
      data: { totalScore, bonusScore },
    });
    bracketsUpdated++;
  }

  return { bracketsUpdated, gamesScored: games.length };
}
