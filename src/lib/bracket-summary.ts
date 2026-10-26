// How a bracket stands: points by round, champion and Final Four status, and how it compares with another
// bracket or the pool. Pure (bracket ID space, like the scoring engine) so the server and tests share it.
import type { BracketPick } from "@/lib/bracket-validation";
import { maxPossibleScore, scoreBracket, type Winners } from "@/lib/scoring-engine";
import { SCORING_RULES } from "@/lib/scoring";
import { choiceResult, type ChoiceResult } from "@/lib/picker";

export interface RoundSummary {
  round: number;
  /** Points if every 1st choice in the round were right */
  max: number;
  earned: number;
  /** Still reachable with teams that haven't been knocked out */
  possible: number;
  /** Lost for good: wrong picks, lower-ranked hits, and picks whose teams are out */
  gone: number;
  games: number;
  decided: number;
  /** Decided games where the 1st choice won */
  firstChoiceRight: number;
}

export interface TeamStatus {
  team: string;
  state: ChoiceResult;
}

export interface BracketSummary {
  /** Total including the Final Four bonus */
  score: number;
  bonus: number;
  max: number;
  /** Points still reachable (max - score) */
  inPlay: number;
  rounds: RoundSummary[];
  champion: TeamStatus | null;
  /** 1st choice to win each region (the Final Four you picked), in region order */
  finalFour: TeamStatus[];
}

const ruleFor = (round: number) => SCORING_RULES.find((r) => r.round === round);

export function summarizeBracket(picks: BracketPick[], winners: Winners, eliminated: Set<string>, regions: string[] = []): BracketSummary {
  const scored = scoreBracket(picks, winners);
  const earnedBy = new Map(scored.games.map((g) => [g.gameId, g.points]));
  const rounds: RoundSummary[] = SCORING_RULES.map((r) => ({
    round: r.round,
    max: r.gamesInRound * r.pointsPerChoice[0],
    earned: 0,
    possible: 0,
    gone: 0,
    games: r.gamesInRound,
    decided: 0,
    firstChoiceRight: 0,
  }));

  for (const pick of picks) {
    const rule = ruleFor(pick.round);
    const summary = rounds[pick.round - 1];
    if (!rule || !summary) continue;
    const top = rule.pointsPerChoice[0];
    const choices = pick.choices.slice(0, rule.pointsPerChoice.length);
    const winner = winners.get(pick.gameId);
    if (winner) {
      const points = earnedBy.get(pick.gameId) ?? 0;
      summary.earned += points;
      summary.gone += top - points;
      summary.decided++;
      if (choices[0] === winner) summary.firstChoiceRight++;
    } else {
      const best = choices.findIndex((team) => !eliminated.has(team));
      const points = best === -1 ? 0 : rule.pointsPerChoice[best];
      summary.possible += points;
      summary.gone += top - points;
    }
  }
  // Games with no pick (incomplete drafts) can't score
  for (const r of rounds) r.gone += r.max - r.earned - r.possible - r.gone;

  const status = (gameId: string, team: string | undefined): TeamStatus | null =>
    team ? { team, state: choiceResult(team, winners.get(gameId), eliminated) } : null;
  const championPick = picks.find((p) => p.round === 6);
  const regionIndex = (gameId: string) => {
    const i = regions.indexOf(gameId.split("-r")[0]);
    return i === -1 ? regions.length : i;
  };
  const finalFour = picks
    .filter((p) => p.round === 4)
    .sort((a, b) => regionIndex(a.gameId) - regionIndex(b.gameId) || a.gameId.localeCompare(b.gameId))
    .flatMap((p) => status(p.gameId, p.choices[0]) ?? []);

  const score = scored.total + scored.bonus;
  const max = maxPossibleScore(picks, winners, eliminated);
  return {
    score,
    bonus: scored.bonus,
    max,
    inPlay: max - score,
    rounds,
    champion: championPick ? status(championPick.gameId, championPick.choices[0]) : null,
    finalFour,
  };
}

export interface PickDiff {
  gameId: string;
  round: number;
  mine: string[];
  theirs: string[];
  /** The result that's best for you against them (null when every pick in play helps them more: root against `rootAgainst`) */
  rootFor: string | null;
  rootAgainst: string | null;
  /** Your points and theirs if `rootFor` (or, when null, `rootAgainst`) wins */
  myPoints: number;
  theirPoints: number;
  /** myPoints - theirPoints */
  gain: number;
}

export interface Comparison {
  diffs: PickDiff[];
  /** Sum of every game's best gain: how much ground you can make up */
  upside: number;
  /** Decided games where you both earned the same points */
  matchedDecided: number;
  decided: number;
}

/** Undecided games where two brackets can score differently, biggest gain for you first */
export function compareBrackets(mine: BracketPick[], theirs: BracketPick[], winners: Winners, eliminated: Set<string>): Comparison {
  const theirsById = new Map(theirs.map((p) => [p.gameId, p]));
  const mineScored = new Map(scoreBracket(mine, winners).games.map((g) => [g.gameId, g.points]));
  const theirsScored = new Map(scoreBracket(theirs, winners).games.map((g) => [g.gameId, g.points]));
  const diffs: PickDiff[] = [];
  let matchedDecided = 0;
  let decided = 0;

  for (const pick of mine) {
    const rule = ruleFor(pick.round);
    if (!rule) continue;
    const slots = rule.pointsPerChoice.length;
    const a = pick.choices.slice(0, slots);
    const b = theirsById.get(pick.gameId)?.choices.slice(0, slots) ?? [];
    if (winners.has(pick.gameId)) {
      decided++;
      if ((mineScored.get(pick.gameId) ?? 0) === (theirsScored.get(pick.gameId) ?? 0)) matchedDecided++;
      continue;
    }
    const points = (choices: string[], team: string) => {
      const i = choices.indexOf(team);
      return i === -1 ? 0 : rule.pointsPerChoice[i];
    };
    const candidates = [...new Set([...a, ...b])].filter((team) => !eliminated.has(team));
    const options = candidates
      .map((team) => ({ team, myPoints: points(a, team), theirPoints: points(b, team) }))
      .sort((x, y) => y.myPoints - y.theirPoints - (x.myPoints - x.theirPoints) || y.myPoints - x.myPoints);
    const best = options[0];
    if (!best || best.myPoints === best.theirPoints) continue;
    const { team, ...pts } = best.myPoints > best.theirPoints ? best : options[options.length - 1];
    const ahead = best.myPoints > best.theirPoints;
    diffs.push({ gameId: pick.gameId, round: pick.round, mine: a, theirs: b, rootFor: ahead ? team : null, rootAgainst: ahead ? null : team, ...pts, gain: pts.myPoints - pts.theirPoints });
  }

  diffs.sort((x, y) => y.gain - x.gain || y.round - x.round);
  return { diffs, upside: diffs.reduce((sum, d) => sum + Math.max(0, d.gain), 0), matchedDecided, decided };
}

export interface BoldPick {
  gameId: string;
  round: number;
  team: string;
  /** Share of the pool (%) with the same team as their 1st choice */
  pct: number;
  points: number;
}

/**
 * 1st choices few others made (≤ `threshold`% of the pool): the ones still alive are where you can gain
 * the most on the field; the ones that won are the calls that paid off.
 */
export function boldPicks(
  picks: BracketPick[],
  gamePicks: Record<string, Record<string, number>>,
  winners: Winners,
  eliminated: Set<string>,
  threshold = 20
): { alive: BoldPick[]; paidOff: BoldPick[] } {
  const alive: BoldPick[] = [];
  const paidOff: BoldPick[] = [];
  for (const pick of picks) {
    const team = pick.choices[0];
    const rule = ruleFor(pick.round);
    if (!team || !rule) continue;
    const pct = gamePicks[pick.gameId]?.[`0:${team}`] ?? 0;
    if (pct > threshold) continue;
    const entry = { gameId: pick.gameId, round: pick.round, team, pct, points: rule.pointsPerChoice[0] };
    const winner = winners.get(pick.gameId);
    if (winner === team) paidOff.push(entry);
    else if (!winner && !eliminated.has(team)) alive.push(entry);
  }
  const order = (x: BoldPick, y: BoldPick) => y.points - x.points || x.pct - y.pct;
  return { alive: alive.sort(order), paidOff: paidOff.sort(order) };
}
