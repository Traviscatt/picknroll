import { db } from "@/lib/db";
import { SCORING_RULES, FINAL_FOUR_BONUS, FINAL_FOUR_ROUND, FINAL_FOUR_GAMES_COUNT } from "@/lib/scoring";

const ESPN_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball";

interface CompletedEvent {
  id: string;
  competitors: { espnTeamId: string; score: number; winner: boolean }[];
}

export type EspnSyncResult =
  | { status: "no-tournament" }
  | {
      status: "ok";
      gamesFound: number;
      completedFound: number;
      gamesUpdated: number;
      bracketsUpdated: number;
      gamesScored: number;
    };

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${dd}`;
}

// Date strings (YYYYMMDD) for today and the previous days (catches missed syncs and games spanning midnight)
export function recentDates(days = 3): string[] {
  const dates: string[] = [];
  for (let daysAgo = 0; daysAgo < days; daysAgo++) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    dates.push(formatDate(d));
  }
  return dates;
}

// Date strings (YYYYMMDD) for the tournament window, up to today
export function tournamentDates(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const current = new Date(start);
  const today = new Date();
  const limit = today < end ? today : end;
  while (current <= limit) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// Fetches completed NCAA tournament games from ESPN. Does not touch the database.
async function fetchCompletedEvents(dates: string[]) {
  const events: CompletedEvent[] = [];
  let gamesFound = 0;

  for (const date of dates) {
    let espnData;
    try {
      const res = await fetch(`${ESPN_BASE_URL}/scoreboard?dates=${date}&limit=100&groups=100`, { cache: "no-store" });
      if (!res.ok) continue;
      espnData = await res.json();
    } catch {
      console.error(`Failed to fetch ESPN data for date ${date}`);
      continue;
    }

    for (const event of espnData.events || []) {
      gamesFound++;
      if (event.status?.type?.completed !== true) continue;
      const competitors = event.competitions?.[0]?.competitors || [];
      if (competitors.length !== 2) continue;
      events.push({
        id: event.id,
        competitors: competitors.map((c: { id?: string; team?: { id?: string }; score?: string; winner?: boolean }) => ({
          espnTeamId: c.team?.id || c.id || "",
          score: parseInt(c.score ?? "") || 0,
          winner: c.winner === true,
        })),
      });
    }
  }

  return { events, gamesFound };
}

/**
 * Pull completed results from ESPN, write them to the current tournament's games, and rescore brackets.
 * - `dates` omitted: syncs the full tournament window (admin "sync now").
 * - `rescore: "ifChanged"`: skips the database entirely when ESPN reports no completed games,
 *   and only rescores when at least one game was updated (scheduled job).
 */
export async function syncEspnResults({
  dates,
  rescore,
}: {
  dates?: string[];
  rescore: "always" | "ifChanged";
}): Promise<EspnSyncResult> {
  let tournament = null;
  if (!dates) {
    tournament = await db.tournament.findFirst({ orderBy: { year: "desc" } });
    if (!tournament) return { status: "no-tournament" };
    dates = tournamentDates(tournament.startDate, tournament.endDate);
  }

  const { events, gamesFound } = await fetchCompletedEvents(dates);
  const empty = { status: "ok" as const, gamesFound, completedFound: events.length, gamesUpdated: 0, bracketsUpdated: 0, gamesScored: 0 };
  if (events.length === 0 && rescore === "ifChanged") return empty;

  tournament ??= await db.tournament.findFirst({ orderBy: { year: "desc" } });
  if (!tournament) return { status: "no-tournament" };

  // Build ESPN ID -> TournamentTeam ID map
  const tournamentTeams = await db.tournamentTeam.findMany({
    where: { tournamentId: tournament.id },
    include: { team: true },
  });
  const espnToTournamentTeam = new Map<string, string>();
  for (const tt of tournamentTeams) {
    if (tt.team.espnId) espnToTournamentTeam.set(tt.team.espnId, tt.id);
  }

  let gamesUpdated = 0;
  for (const event of events) {
    const [c1, c2] = event.competitors;
    const tt1Id = espnToTournamentTeam.get(c1.espnTeamId);
    const tt2Id = espnToTournamentTeam.get(c2.espnTeamId);
    if (!tt1Id || !tt2Id) continue; // Teams not in our tournament

    // Determine winner
    const winnerTtId = c1.winner ? tt1Id : c2.winner ? tt2Id : null;
    if (!winnerTtId) continue;

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
        const t1Score = dbGame.team1Id === tt1Id ? c1.score : c2.score;
        const t2Score = dbGame.team1Id === tt1Id ? c2.score : c1.score;
        await db.game.update({
          where: { id: dbGame.id },
          data: { winnerId: winnerTtId, team1Score: t1Score, team2Score: t2Score, status: "FINAL", espnGameId: event.id },
        });
        gamesUpdated++;
      }
    } else {
      // Later-round game — find an unfilled game slot and assign teams + result
      const filled = await fillLaterRoundGame(tournament.id, tt1Id, tt2Id, winnerTtId, c1.score, c2.score, event.id);
      if (filled) gamesUpdated++;
    }
  }

  // Auto-recalculate scores after syncing
  let scoreResult = { bracketsUpdated: 0, gamesScored: 0 };
  if (rescore === "always" || gamesUpdated > 0) {
    scoreResult = await recalculateScores(tournament.id);
  }

  return { ...empty, gamesUpdated, ...scoreResult };
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

// Recalculate all bracket scores
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
      }
    }

    if (bracket.picks.length === 0 && bracket.picksData) {
      try {
        const picksArray = JSON.parse(bracket.picksData);
        const picksDataFinalFour: { gameId: string; teamId: string }[] = [];
        for (const pickData of picksArray) {
          if (!pickData.gameId || !pickData.choices) continue;
          const game = bracketGameMap.get(pickData.gameId);
          if (!game || !game.winnerId) continue;

          const rule = SCORING_RULES.find((r) => r.round === game.round);
          if (!rule) continue;

          // Track 1st choice for Elite 8 games (bonus check)
          if (game.round === FINAL_FOUR_ROUND && pickData.choices[0]) {
            const firstChoiceId = teamIdMap.get(pickData.choices[0]) || pickData.choices[0];
            picksDataFinalFour.push({ gameId: game.id, teamId: firstChoiceId });
          }

          for (let rank = 0; rank < pickData.choices.length; rank++) {
            if (rank >= rule.pointsPerChoice.length) break;
            const pickedTeamId = teamIdMap.get(pickData.choices[rank]) || pickData.choices[rank];
            if (pickedTeamId === game.winnerId) {
              totalScore += rule.pointsPerChoice[rank];
            }
          }
        }

        // Check Final Four bonus for picksData brackets
        const pdFinalFourGames = games.filter(g => g.round === FINAL_FOUR_ROUND);
        if (pdFinalFourGames.length === FINAL_FOUR_GAMES_COUNT && picksDataFinalFour.length === FINAL_FOUR_GAMES_COUNT) {
          let allCorrect = true;
          for (const ffGame of pdFinalFourGames) {
            const pick = picksDataFinalFour.find(p => p.gameId === ffGame.id);
            if (!pick || pick.teamId !== ffGame.winnerId) {
              allCorrect = false;
              break;
            }
          }
          if (allCorrect) {
            bonusScore = FINAL_FOUR_BONUS;
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
