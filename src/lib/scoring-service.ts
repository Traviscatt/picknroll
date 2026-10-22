// Database layer around the pure scoring engine.
import { db } from "@/lib/db";
import {
  actualTiebreaker,
  buildBracketGameMap,
  buildTeamKeyMaps,
  finalWinners,
  parsePicksData,
  rankEntries,
  scoreBracket,
} from "@/lib/scoring-engine";

export const SCORED_STATUSES = ["SUBMITTED", "PAID"];

export function getCurrentTournament() {
  return db.tournament.findFirst({ orderBy: { year: "desc" } });
}

/** Games, team mappings, and final winners for a tournament, all in bracket ID space */
export async function loadTournamentResults(tournamentId: string) {
  const [games, teams, tournament] = await Promise.all([
    db.game.findMany({
      where: { tournamentId },
      select: {
        id: true, round: true, gameNumber: true, region: true, status: true, winnerId: true,
        team1Id: true, team2Id: true, team1Score: true, team2Score: true,
      },
    }),
    db.tournamentTeam.findMany({ where: { tournamentId }, select: { id: true, seed: true, region: true } }),
    db.tournament.findUnique({ where: { id: tournamentId }, select: { actualTiebreaker: true } }),
  ]);

  const gameMap = buildBracketGameMap(games);
  const { idToKey, keyToId } = buildTeamKeyMaps(teams);
  const winners = finalWinners(gameMap, idToKey);
  return {
    games,
    gameMap,
    idToKey,
    keyToId,
    winners,
    actualTiebreaker: actualTiebreaker(tournament?.actualTiebreaker, gameMap),
  };
}

/** Rescores every submitted bracket in the tournament's pools; only changed scores are written */
export async function recalculateScores(tournamentId: string) {
  const { winners } = await loadTournamentResults(tournamentId);
  const brackets = await db.bracket.findMany({
    where: { status: { in: SCORED_STATUSES }, pool: { tournamentId } },
    select: { id: true, picksData: true, totalScore: true, bonusScore: true },
  });

  const updates = brackets.flatMap((bracket) => {
    const { total, bonus } = scoreBracket(parsePicksData(bracket.picksData), winners);
    if (total === bracket.totalScore && bonus === bracket.bonusScore) return [];
    return [db.bracket.update({ where: { id: bracket.id }, data: { totalScore: total, bonusScore: bonus } })];
  });
  if (updates.length > 0) await db.$transaction(updates);

  return { bracketsScored: brackets.length, bracketsChanged: updates.length, gamesScored: winners.size };
}

/** Championship combined score for tie-breaking: admin override, else the final championship score */
export async function getActualTiebreaker(tournamentId: string) {
  const [tournament, championship] = await Promise.all([
    db.tournament.findUnique({ where: { id: tournamentId }, select: { actualTiebreaker: true } }),
    db.game.findFirst({
      where: { tournamentId, round: 6 },
      select: { id: true, round: true, gameNumber: true, region: true, status: true, winnerId: true, team1Score: true, team2Score: true },
    }),
  ]);
  return actualTiebreaker(tournament?.actualTiebreaker, new Map(championship ? [["championship-r6-g1", championship]] : []));
}

/** Ranks a pool's brackets by total + bonus, breaking ties by tiebreaker once the actual total is known */
export function rankBrackets<B extends { totalScore: number; bonusScore: number; tiebreaker: number | null }>(
  brackets: B[],
  actual: number | null
) {
  return rankEntries(
    brackets.map((b) => ({ ...b, score: b.totalScore + b.bonusScore })),
    actual
  );
}
