// Pick N Roll scoring engine: pure functions, no database access.
//
// Everything works in the bracket's own ID space, the same one stored in Bracket.picksData:
//   game IDs: "East-r1-g1" ... "Midwest-r4-g1", "final-four-r5-g1|2", "championship-r6-g1"
//   team keys: "<region>-<seed>", e.g. "east-1"
// Database games/teams are mapped into that space once, then any set of winners (final results,
// live leaders, or hypothetical outcomes) can be scored the same way.
import type { BracketPick } from "@/lib/bracket-validation";
import { FINAL_FOUR_BONUS, FINAL_FOUR_GAMES_COUNT, FINAL_FOUR_ROUND, SCORING_RULES } from "@/lib/scoring";

export interface EngineGame {
  id: string;
  round: number;
  gameNumber: number;
  region: string | null;
  status: string;
  winnerId: string | null;
  team1Id?: string | null;
  team2Id?: string | null;
  team1Score?: number | null;
  team2Score?: number | null;
}

export interface EngineTeam {
  id: string;
  seed: number;
  region: string;
}

/** bracket game ID -> team key of the winner */
export type Winners = Map<string, string>;

export const teamKey = (team: { region: string; seed: number }) => `${team.region.toLowerCase()}-${team.seed}`;

export function buildTeamKeyMaps(teams: EngineTeam[]) {
  const idToKey = new Map<string, string>();
  const keyToId = new Map<string, string>();
  for (const team of teams) {
    const key = teamKey(team);
    idToKey.set(team.id, key);
    keyToId.set(key, team.id);
  }
  return { idToKey, keyToId };
}

/**
 * Maps database games to bracket game IDs. Regional games are numbered per region in gameNumber order
 * (DB numbering is sequential across regions, e.g. Midwest R1 = 25..32 -> Midwest-r1-g1..g8).
 */
export function buildBracketGameMap<G extends EngineGame>(games: G[]): Map<string, G> {
  const grouped = new Map<string, G[]>();
  for (const game of games) {
    const key = `${game.round}-${game.region || "none"}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(game);
  }

  const map = new Map<string, G>();
  for (const group of grouped.values()) {
    group.sort((a, b) => a.gameNumber - b.gameNumber);
    group.forEach((game, i) => {
      if (game.region && game.round <= 4) map.set(`${game.region}-r${game.round}-g${i + 1}`, game);
      else if (game.round === 5) map.set(`final-four-r5-g${game.gameNumber}`, game);
      else map.set(`championship-r6-g${game.gameNumber}`, game);
    });
  }
  return map;
}

/** Winners of completed games, keyed by bracket game ID */
export function finalWinners(gameMap: Map<string, EngineGame>, idToKey: Map<string, string>): Winners {
  const winners: Winners = new Map();
  for (const [bracketGameId, game] of gameMap) {
    if (game.status !== "FINAL" || !game.winnerId) continue;
    const key = idToKey.get(game.winnerId);
    if (key) winners.set(bracketGameId, key);
  }
  return winners;
}

export interface LiveGame {
  gameId: string;
  team1: string;
  team2: string;
  team1Score: number;
  team2Score: number;
}

/**
 * Final results plus the team currently leading each in-progress game ("if the games ended now").
 * Tied games have no provisional winner.
 */
export function withLiveLeaders(finals: Winners, live: LiveGame[]): Winners {
  const winners: Winners = new Map(finals);
  for (const game of live) {
    if (winners.has(game.gameId) || game.team1Score === game.team2Score) continue;
    winners.set(game.gameId, game.team1Score > game.team2Score ? game.team1 : game.team2);
  }
  return winners;
}

export interface GameScore {
  gameId: string;
  round: number;
  points: number;
  /** 1-based rank of the choice that matched the winner, or null if none did */
  matchedRank: number | null;
}

export interface BracketScore {
  total: number;
  bonus: number;
  games: GameScore[];
}

/**
 * Scores a bracket against a set of winners. Only decided games count.
 * Multi-choice: the first ranked choice that matches the winner earns that rank's points.
 * Bonus: +10 when all four Elite 8 (round 4) games are decided and every 1st choice was right.
 */
export function scoreBracket(picks: BracketPick[], winners: Winners): BracketScore {
  let total = 0;
  const games: GameScore[] = [];
  let decidedEliteEight = 0;
  let correctEliteEightFirstChoices = 0;

  for (const pick of picks) {
    const winner = winners.get(pick.gameId);
    if (!winner) continue;
    const rule = SCORING_RULES.find((r) => r.round === pick.round);
    if (!rule) continue;

    const rankIndex = pick.choices.slice(0, rule.pointsPerChoice.length).indexOf(winner);
    const points = rankIndex === -1 ? 0 : rule.pointsPerChoice[rankIndex];
    total += points;
    games.push({ gameId: pick.gameId, round: pick.round, points, matchedRank: rankIndex === -1 ? null : rankIndex + 1 });

    if (pick.round === FINAL_FOUR_ROUND) {
      decidedEliteEight++;
      if (pick.choices[0] === winner) correctEliteEightFirstChoices++;
    }
  }

  const eliteEightComplete = [...winners.keys()].filter((id) => /-r4-g\d+$/.test(id)).length === FINAL_FOUR_GAMES_COUNT;
  const bonus =
    eliteEightComplete && decidedEliteEight === FINAL_FOUR_GAMES_COUNT && correctEliteEightFirstChoices === FINAL_FOUR_GAMES_COUNT
      ? FINAL_FOUR_BONUS
      : 0;

  return { total, bonus, games };
}

/** Parses Bracket.picksData; malformed data scores as an empty bracket */
export function parsePicksData(picksData: string | null): BracketPick[] {
  if (!picksData) return [];
  try {
    const parsed = JSON.parse(picksData);
    return Array.isArray(parsed) ? parsed.filter((p) => p && typeof p.gameId === "string" && Array.isArray(p.choices)) : [];
  } catch {
    return [];
  }
}

/** Actual championship combined score: admin override, otherwise the final championship score */
export function actualTiebreaker(override: number | null | undefined, gameMap: Map<string, EngineGame>): number | null {
  if (override != null) return override;
  const championship = gameMap.get("championship-r6-g1");
  if (championship?.status !== "FINAL" || championship.team1Score == null || championship.team2Score == null) return null;
  return championship.team1Score + championship.team2Score;
}

export interface RankableEntry {
  score: number;
  tiebreaker: number | null;
}

/**
 * Sorts by score (desc), then by tiebreaker closeness to the actual championship total once it's known
 * (missing predictions last). Entries still tied share a rank (1, 2, 2, 4).
 */
export function rankEntries<E extends RankableEntry>(entries: E[], actual: number | null): (E & { rank: number })[] {
  const distance = (e: E) =>
    actual == null ? 0 : e.tiebreaker == null ? Number.POSITIVE_INFINITY : Math.abs(e.tiebreaker - actual);
  const sorted = [...entries].sort((a, b) => b.score - a.score || distance(a) - distance(b));

  let rank = 0;
  return sorted.map((entry, i) => {
    const prev = sorted[i - 1];
    if (!prev || prev.score !== entry.score || distance(prev) !== distance(entry)) rank = i + 1;
    return { ...entry, rank };
  });
}
