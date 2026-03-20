import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SCORING_RULES, FINAL_FOUR_BONUS, FINAL_FOUR_ROUND, FINAL_FOUR_GAMES_COUNT } from "@/lib/scoring";

const ESPN_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball";

// GET /api/cron/espn-sync - Called by Vercel Cron every 2 minutes
export async function GET() {
  try {
    const tournament = await db.tournament.findFirst({
      orderBy: { year: "desc" },
    });

    if (!tournament) {
      return NextResponse.json({ message: "No tournament found" });
    }

    // Build ESPN ID -> TournamentTeam ID map
    const tournamentTeams = await db.tournamentTeam.findMany({
      where: { tournamentId: tournament.id },
      include: { team: true },
    });

    const espnToTournamentTeam = new Map<string, string>();
    for (const tt of tournamentTeams) {
      if (tt.team.espnId) {
        espnToTournamentTeam.set(tt.team.espnId, tt.id);
      }
    }

    // Fetch today's ESPN scoreboard (tournament games only via groups=100)
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const dateStr = `${y}${m}${d}`;

    const url = `${ESPN_BASE_URL}/scoreboard?dates=${dateStr}&limit=100&groups=100`;

    let espnData;
    try {
      const espnResponse = await fetch(url, { cache: "no-store" });
      if (!espnResponse.ok) {
        return NextResponse.json({ message: "ESPN API unavailable" });
      }
      espnData = await espnResponse.json();
    } catch {
      return NextResponse.json({ message: "Failed to fetch ESPN data" });
    }

    const events = espnData.events || [];
    let gamesUpdated = 0;

    for (const event of events) {
      const competition = event.competitions?.[0];
      if (!competition) continue;

      const isComplete = event.status?.type?.completed === true;
      if (!isComplete) continue;

      const competitors = competition.competitors || [];
      if (competitors.length !== 2) continue;

      const espnTeam1Id = competitors[0]?.team?.id || competitors[0]?.id;
      const espnTeam2Id = competitors[1]?.team?.id || competitors[1]?.id;

      const tt1Id = espnToTournamentTeam.get(espnTeam1Id);
      const tt2Id = espnToTournamentTeam.get(espnTeam2Id);

      if (!tt1Id || !tt2Id) continue;

      const winner1 = competitors[0]?.winner === true;
      const winner2 = competitors[1]?.winner === true;
      const winnerTtId = winner1 ? tt1Id : winner2 ? tt2Id : null;
      if (!winnerTtId) continue;

      const score1 = parseInt(competitors[0]?.score) || 0;
      const score2 = parseInt(competitors[1]?.score) || 0;

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
        const filled = await fillLaterRoundGame(tournament.id, tt1Id, tt2Id, winnerTtId, score1, score2, event.id);
        if (filled) gamesUpdated++;
      }
    }

    // Auto-recalculate scores if any games were updated
    let bracketsUpdated = 0;
    if (gamesUpdated > 0) {
      const result = await recalculateScores(tournament.id);
      bracketsUpdated = result.bracketsUpdated;
    }

    return NextResponse.json({
      message: `Cron sync: ${gamesUpdated} games updated, ${bracketsUpdated} brackets scored.`,
      gamesUpdated,
      bracketsUpdated,
      date: dateStr,
    });
  } catch (error) {
    console.error("Cron ESPN sync error:", error);
    return NextResponse.json({ error: "Cron sync failed" }, { status: 500 });
  }
}

async function fillLaterRoundGame(
  tournamentId: string,
  tt1Id: string,
  tt2Id: string,
  winnerTtId: string,
  score1: number,
  score2: number,
  espnGameId: string
): Promise<boolean> {
  const unfilledGames = await db.game.findMany({
    where: {
      tournamentId,
      status: { not: "FINAL" },
      OR: [{ team1Id: null }, { team2Id: null }],
    },
    orderBy: [{ round: "asc" }, { gameNumber: "asc" }],
  });

  for (const game of unfilledGames) {
    if (!game.team1Id && !game.team2Id) {
      await db.game.update({
        where: { id: game.id },
        data: {
          team1Id: tt1Id, team2Id: tt2Id, winnerId: winnerTtId,
          team1Score: score1, team2Score: score2, status: "FINAL", espnGameId,
        },
      });
      return true;
    }
    if (game.team1Id === tt1Id && !game.team2Id) {
      await db.game.update({
        where: { id: game.id },
        data: {
          team2Id: tt2Id, winnerId: winnerTtId,
          team1Score: score1, team2Score: score2, status: "FINAL", espnGameId,
        },
      });
      return true;
    }
    if (game.team1Id === tt2Id && !game.team2Id) {
      await db.game.update({
        where: { id: game.id },
        data: {
          team2Id: tt1Id, winnerId: winnerTtId,
          team1Score: score2, team2Score: score1, status: "FINAL", espnGameId,
        },
      });
      return true;
    }
    if (!game.team1Id && game.team2Id === tt1Id) {
      await db.game.update({
        where: { id: game.id },
        data: {
          team1Id: tt2Id, winnerId: winnerTtId,
          team1Score: score2, team2Score: score1, status: "FINAL", espnGameId,
        },
      });
      return true;
    }
    if (!game.team1Id && game.team2Id === tt2Id) {
      await db.game.update({
        where: { id: game.id },
        data: {
          team1Id: tt1Id, winnerId: winnerTtId,
          team1Score: score1, team2Score: score2, status: "FINAL", espnGameId,
        },
      });
      return true;
    }
  }
  return false;
}

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

      if (pick.game.round === FINAL_FOUR_ROUND) {
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
