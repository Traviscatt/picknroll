// Bracket picking rules, shared by the picker UI and server validation. Pure: no React, DB, or network.
//
// Who can be picked in each game:
// - Round 1: the two teams in the matchup.
// - Round 2: any of the four teams from the two feeder Round 1 games (independent of Round 1 picks, by design).
// - Sweet 16: the Round 2 picks of its two feeder games.
// - Elite 8, Final Four, Championship: every team ranked in the two feeder games.
import type { BracketPick } from "@/lib/bracket-validation";
import { SCORING_RULES } from "@/lib/scoring";
import { finalFourPairs, R1_SEED_PAIRS, slotKey } from "@/lib/tournament-field";

export type Picks = Map<string, BracketPick>;

export interface GameSlot {
  gameId: string;
  round: number;
  /** Region name, or null for the Final Four and Championship */
  region: string | null;
  /** 1-based game number within the round (per region for rounds 1–4) */
  number: number;
  feeders: string[];
}

export const choicesFor = (round: number) => SCORING_RULES.find((r) => r.round === round)?.choices ?? 1;
export const pointsFor = (round: number) => SCORING_RULES.find((r) => r.round === round)?.pointsPerChoice ?? [];

/** All 63 games in bracket order: round by round, regions in tournament order */
export function bracketGames(regions: string[]): GameSlot[] {
  const games: GameSlot[] = [];
  for (let round = 1; round <= 4; round++) {
    const count = 8 >> (round - 1);
    for (const region of regions) {
      for (let n = 1; n <= count; n++) {
        const feeders = round === 1 ? [] : [`${region}-r${round - 1}-g${2 * n - 1}`, `${region}-r${round - 1}-g${2 * n}`];
        games.push({ gameId: `${region}-r${round}-g${n}`, round, region, number: n, feeders });
      }
    }
  }
  finalFourPairs(regions).forEach(([a, b], i) =>
    games.push({ gameId: `final-four-r5-g${i + 1}`, round: 5, region: null, number: i + 1, feeders: [`${a}-r4-g1`, `${b}-r4-g1`] })
  );
  games.push({ gameId: "championship-r6-g1", round: 6, region: null, number: 1, feeders: ["final-four-r5-g1", "final-four-r5-g2"] });
  return games;
}

const r1Teams = (region: string, n: number) => R1_SEED_PAIRS[n - 1].map((seed) => slotKey(region, seed));

/** Teams that may be picked in a game, in display order */
export function eligibleTeams(game: GameSlot, picks: Picks): string[] {
  if (game.round === 1) return r1Teams(game.region!, game.number);
  if (game.round === 2) return [...r1Teams(game.region!, 2 * game.number - 1), ...r1Teams(game.region!, 2 * game.number)];
  const fromFeeder = (gameId: string) => {
    const choices = picks.get(gameId)?.choices ?? [];
    return game.round === 3 ? choices.slice(0, 1) : choices;
  };
  return [...new Set(game.feeders.flatMap(fromFeeder))];
}

export const isComplete = (game: GameSlot, picks: Picks) => (picks.get(game.gameId)?.choices.length ?? 0) >= choicesFor(game.round);

/** A game opens once its feeder games are fully picked (rounds 1–2 are always open) */
export function isUnlocked(game: GameSlot, picks: Picks, byId: Map<string, GameSlot>): boolean {
  if (game.round <= 2) return true;
  return game.feeders.every((f) => {
    const feeder = byId.get(f);
    return !!feeder && isComplete(feeder, picks);
  });
}

export type TapResult = "set" | "replaced" | "removed" | "added" | "full";

/**
 * Tap a team: single-choice games select it (or clear it if already picked);
 * ranked games add it as the next rank, or remove it (later ranks move up). A full ranked game is unchanged.
 */
export function applyTap(picks: Picks, game: GameSlot, teamId: string): { picks: Picks; result: TapResult } {
  const max = choicesFor(game.round);
  const current = picks.get(game.gameId)?.choices ?? [];
  const next = new Map(picks);
  const set = (choices: string[]) => {
    if (choices.length) next.set(game.gameId, { gameId: game.gameId, round: game.round, choices });
    else next.delete(game.gameId);
  };

  if (current.includes(teamId)) {
    set(current.filter((t) => t !== teamId));
    return { picks: next, result: "removed" };
  }
  if (max === 1) {
    set([teamId]);
    return { picks: next, result: current.length ? "replaced" : "set" };
  }
  if (current.length >= max) return { picks, result: "full" };
  set([...current, teamId]);
  return { picks: next, result: "added" };
}

/** Replace a ranked game's order (same teams, new order) */
export function reorderChoices(picks: Picks, game: GameSlot, order: string[]): Picks {
  const current = picks.get(game.gameId)?.choices ?? [];
  if (order.length !== current.length || order.some((t) => !current.includes(t))) return picks;
  return new Map(picks).set(game.gameId, { gameId: game.gameId, round: game.round, choices: order });
}

export interface Removed {
  gameId: string;
  teamId: string;
}

/**
 * Drops choices that are no longer possible after an earlier pick changed (e.g. a Sweet 16 choice whose
 * Round 2 pick was switched). Later rounds see the pruned earlier rounds.
 */
export function pruneImpossible(picks: Picks, games: GameSlot[]): { picks: Picks; removed: Removed[] } {
  let next = picks;
  const removed: Removed[] = [];
  for (const game of games) {
    const pick = next.get(game.gameId);
    if (!pick) continue;
    const allowed = new Set(eligibleTeams(game, next));
    const kept = pick.choices.filter((t) => allowed.has(t));
    if (kept.length === pick.choices.length) continue;
    pick.choices.filter((t) => !allowed.has(t)).forEach((teamId) => removed.push({ gameId: game.gameId, teamId }));
    next = new Map(next);
    if (kept.length) next.set(game.gameId, { ...pick, choices: kept });
    else next.delete(game.gameId);
  }
  return { picks: next, removed };
}

/** Choices that contradict earlier picks (empty = consistent) */
export function inconsistentChoices(picks: BracketPick[], regions: string[]): Removed[] {
  return pruneImpossible(new Map(picks.map((p) => [p.gameId, p])), bracketGames(regions)).removed;
}

export const toPicks = (list: BracketPick[]): Picks => new Map(list.map((p) => [p.gameId, p]));

/** Picked choices / required choices, per round and overall */
export function progress(picks: Picks, games: GameSlot[]) {
  const byRound = new Map<number, { done: number; total: number }>();
  for (const game of games) {
    const r = byRound.get(game.round) ?? { done: 0, total: 0 };
    r.total++;
    if (isComplete(game, picks)) r.done++;
    byRound.set(game.round, r);
  }
  const done = [...byRound.values()].reduce((a, r) => a + r.done, 0);
  return { byRound, done, total: games.length };
}

/** A step in the phone flow: a Round 1 pod (the two games whose winners meet in Round 2) or a single game */
export interface Step {
  key: string;
  round: number;
  region: string | null;
  games: GameSlot[];
}

/** Phone flow order: Round 1 pods, then one game per card, round by round, regions in tournament order */
export function phoneSteps(games: GameSlot[]): Step[] {
  const steps: Step[] = [];
  const r1 = games.filter((g) => g.round === 1);
  for (let i = 0; i < r1.length; i += 2) {
    steps.push({ key: `${r1[i].region}-pod-${(i % 8) / 2 + 1}`, round: 1, region: r1[i].region, games: [r1[i], r1[i + 1]] });
  }
  for (const game of games.filter((g) => g.round > 1)) steps.push({ key: game.gameId, round: game.round, region: game.region, games: [game] });
  return steps;
}

export const stepComplete = (step: Step, picks: Picks) => step.games.every((g) => isComplete(g, picks));
