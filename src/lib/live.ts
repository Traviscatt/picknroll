// Game Center data shared by /api/live and the browser, plus pure helpers for the personal parts
// (verdicts, ranks under hypothetical results, rooting). No database or network access.
import type { BracketPick } from "@/lib/bracket-validation";
import { rankEntries, scoreBracket, withoutGame, withWinner, type PoolSplit, type Winners } from "@/lib/scoring-engine";
import { SCORING_RULES } from "@/lib/scoring";

export type GameState = "pre" | "in" | "half" | "post";

export const ROUND_LABELS: Record<number, string> = {
  0: "First Four",
  1: "Round 1",
  2: "Round 2",
  3: "Sweet 16",
  4: "Elite 8",
  5: "Final Four",
  6: "Championship",
};

export interface LiveTeam {
  /** Bracket slot, e.g. "east-1" (null if ESPN lists a team we don't know) */
  slot: string | null;
  espnId: string;
  name: string;
  seed: number | null;
  logo: string | null;
  score: number | null;
  winner: boolean;
}

export interface LiveGame {
  espnId: string;
  /** Bracket game ID (null for First Four games, which nobody picks) */
  gameId: string | null;
  round: number;
  region: string | null;
  state: GameState;
  /** ESPN status text, e.g. "Final", "Halftime", "12:34 - 2nd Half" */
  detail: string;
  startTime: string;
  network: string | null;
  teams: [LiveTeam, LiveTeam];
  /** How the pool ranked the two teams (after the deadline only) */
  poolSplit: PoolSplit | null;
}

export interface StandingEntry {
  bracketId: string;
  name: string;
  bracketName: string;
  tiebreaker: number | null;
  /** Final results only */
  official: number;
  officialRank: number;
  /** Final results plus every in-progress game's current leader */
  live: number;
  liveRank: number;
  /** Highest score still reachable (official results) */
  max: number;
}

/** Every bracket's total (incl. bonus) for each result of one undecided game, aligned with `standings` */
export interface Outcome {
  gameId: string;
  teams: [string, string];
  /** Totals with this game undecided and other games at their live state */
  base: number[];
  totals: [number[], number[]];
}

export interface LiveDay {
  /** YYYYMMDD (US Eastern) */
  date: string;
  label: string;
  round: string;
}

export interface LivePayload {
  generatedAt: string;
  date: string;
  today: string;
  days: LiveDay[];
  anyLive: boolean;
  nextTipoff: string | null;
  deadlinePassed: boolean;
  actualTiebreaker: number | null;
  games: LiveGame[];
  standings: StandingEntry[];
  outcomes: Outcome[];
}

export const isLive = (game: LiveGame) => game.state === "in" || game.state === "half";

/** Slot of the winner (final) or current leader (in progress); null when tied or not started */
export function leaderSlot(game: LiveGame): string | null {
  const [a, b] = game.teams;
  if (game.state === "post") return (a.winner ? a.slot : b.winner ? b.slot : null) ?? null;
  if (!isLive(game) || a.score == null || b.score == null || a.score === b.score) return null;
  return a.score > b.score ? a.slot : b.slot;
}

export type VerdictTone = "earned" | "holds" | "now" | "zero" | "pending";

export interface Verdict {
  tone: VerdictTone;
  label: string;
  /** Rank (1-based) of the choice that pays, if any */
  rank: number | null;
}

/** What a bracket's picks for this game are worth right now */
export function pickVerdict(choices: string[], game: LiveGame): Verdict | null {
  if (!game.gameId) return null;
  const rule = SCORING_RULES.find((r) => r.round === game.round);
  if (!rule) return null;
  const ranked = choices.slice(0, rule.pointsPerChoice.length);
  const points = (rank: number) => rule.pointsPerChoice[rank];
  const leader = leaderSlot(game);
  const r = leader ? ranked.indexOf(leader) : -1;
  const playing = game.teams.map((t) => t.slot).filter((s): s is string => !!s);
  const live = ranked.map((team, i) => ({ team, i })).filter(({ team }) => playing.includes(team));

  if (game.state === "post") {
    return r >= 0 ? { tone: "earned", label: `+${points(r)} earned`, rank: r + 1 } : { tone: "zero", label: "0 pts", rank: null };
  }
  if (isLive(game)) {
    if (r === 0) return { tone: "holds", label: `+${points(0)} if it holds`, rank: 1 };
    if (r > 0) return { tone: "now", label: `+${points(r)} now`, rank: r + 1 };
    if (!leader && live.length) return { tone: "pending", label: "Tied", rank: null };
    return { tone: "zero", label: live.length ? "0 so far" : "No points possible", rank: null };
  }
  if (!live.length) return { tone: "zero", label: "No points possible", rank: null };
  return { tone: "pending", label: `${live.map(({ i }) => points(i)).join(" / ")} pts at stake`, rank: null };
}

/** Rank of entry `index` if every bracket had the given scores */
export function rankWithScores(standings: StandingEntry[], scores: number[], index: number, actualTiebreaker: number | null): number {
  const ranked = rankEntries(
    standings.map((s, i) => ({ i, score: scores[i], tiebreaker: s.tiebreaker })),
    actualTiebreaker
  );
  return ranked.find((e) => e.i === index)?.rank ?? standings.length;
}

export interface RootingOption {
  team: string;
  /** Points this result adds for you */
  points: number;
  /** Your live rank if this result happens */
  rank: number;
  /** Average points the pool gets from this result */
  poolAvg: number;
}

export interface Rooting {
  gameId: string;
  options: [RootingOption, RootingOption];
  /** Index of the result that's better for you */
  recommended: 0 | 1;
  /** Places between the two results */
  swing: number;
}

/**
 * Every bracket's total under each result of the undecided bracket games in `games`
 * (`live` = current live state, `decided` = games that are final, incl. ESPN finals not yet recorded).
 */
export function undecidedOutcomes(brackets: BracketPick[][], live: Winners, decided: Winners, games: LiveGame[]): Outcome[] {
  const total = (picks: BracketPick[], winners: Winners) => {
    const s = scoreBracket(picks, winners);
    return s.total + s.bonus;
  };
  return games.flatMap((game) => {
    const [a, b] = game.teams.map((t) => t.slot);
    if (!game.gameId || !a || !b || game.state === "post" || decided.has(game.gameId)) return [];
    const base = withoutGame(live, game.gameId);
    return [
      {
        gameId: game.gameId,
        teams: [a, b] as [string, string],
        base: brackets.map((p) => total(p, base)),
        totals: [brackets.map((p) => total(p, withWinner(base, game.gameId!, a))), brackets.map((p) => total(p, withWinner(base, game.gameId!, b)))] as [number[], number[]],
      },
    ];
  });
}

export function rootingFor(outcome: Outcome, index: number, standings: StandingEntry[], actualTiebreaker: number | null): Rooting {
  const option = (t: 0 | 1): RootingOption => {
    const totals = outcome.totals[t];
    const gains = totals.map((total, e) => total - outcome.base[e]);
    return {
      team: outcome.teams[t],
      points: gains[index],
      rank: rankWithScores(standings, totals, index, actualTiebreaker),
      poolAvg: gains.length ? gains.reduce((a, b) => a + b, 0) / gains.length : 0,
    };
  };
  const options: [RootingOption, RootingOption] = [option(0), option(1)];
  const [a, b] = options;
  const recommended = a.rank !== b.rank ? (a.rank < b.rank ? 0 : 1) : a.points >= b.points ? 0 : 1;
  return { gameId: outcome.gameId, options, recommended, swing: Math.abs(a.rank - b.rank) };
}

/**
 * Best and worst live rank if every remaining game of the day goes your way / against you.
 * Combines per-game results additively (an estimate: the Final Four bonus can interact across games).
 */
export function tonightRange(payload: LivePayload, index: number) {
  const rootings = payload.outcomes.map((o) => rootingFor(o, index, payload.standings, payload.actualTiebreaker));
  if (!rootings.length) return null;
  const scenario = (pickFor: (r: Rooting) => 0 | 1) => {
    const scores = payload.standings.map((s) => s.live);
    payload.outcomes.forEach((outcome, g) => {
      const game = payload.games.find((x) => x.gameId === outcome.gameId);
      const leader = game ? leaderSlot(game) : null;
      const current = leader ? outcome.totals[outcome.teams.indexOf(leader) as 0 | 1] : outcome.base;
      const chosen = outcome.totals[pickFor(rootings[g])];
      scores.forEach((_, e) => (scores[e] += chosen[e] - (current?.[e] ?? outcome.base[e])));
    });
    return { rank: rankWithScores(payload.standings, scores, index, payload.actualTiebreaker), points: scores[index] };
  };
  return {
    best: scenario((r) => r.recommended),
    worst: scenario((r) => (r.recommended === 0 ? 1 : 0)),
  };
}

/** One bracket's view of the day: its standing, rooting per undecided game, picks alive, and the day's range */
export function personalSummary(payload: LivePayload, bracketId: string | null, picksByGame: Map<string, string[]>) {
  const index = payload.standings.findIndex((s) => s.bracketId === bracketId);
  const entry = index >= 0 ? payload.standings[index] : null;
  const rootings = new Map<string, Rooting>();
  if (index >= 0) for (const o of payload.outcomes) rootings.set(o.gameId, rootingFor(o, index, payload.standings, payload.actualTiebreaker));
  const items = payload.games.flatMap((game) => {
    const rooting = game.gameId ? rootings.get(game.gameId) : undefined;
    return rooting ? [{ game, rooting, choices: picksByGame.get(game.gameId!) ?? null }] : [];
  });
  const withPicks = payload.games.filter((g) => g.gameId && picksByGame.has(g.gameId));
  return {
    index,
    entry,
    rootings,
    items,
    biggestSwing: Math.max(0, ...items.map((i) => i.rooting.swing)),
    highlightGame: items.filter((i) => isLive(i.game) && i.rooting.swing > 0).sort((a, b) => b.rooting.swing - a.rooting.swing)[0]?.game.espnId ?? null,
    alive: { total: withPicks.length, alive: withPicks.filter((g) => pickVerdict(picksByGame.get(g.gameId!)!, g)?.tone !== "zero").length },
    range: index >= 0 ? tonightRange(payload, index) : null,
  };
}

const ET_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });

/** YYYYMMDD in US Eastern time */
export const easternDate = (d: Date) => ET_DATE.format(d).replace(/-/g, "");

/** YYYYMMDD shifted by whole days */
export function shiftDate(date: string, days: number) {
  const d = new Date(Date.UTC(+date.slice(0, 4), +date.slice(4, 6) - 1, +date.slice(6, 8) + days));
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

// The NCAA schedule relative to the first Round 1 day (Thursday)
const SCHEDULE: [number, string][] = [
  [-2, "First Four"],
  [-1, "First Four"],
  [0, "Round 1"],
  [1, "Round 1"],
  [2, "Round 2"],
  [3, "Round 2"],
  [7, "Sweet 16"],
  [8, "Sweet 16"],
  [9, "Elite 8"],
  [10, "Elite 8"],
  [16, "Final Four"],
  [18, "Championship"],
];

export function tournamentDays(startDate: string): LiveDay[] {
  // A date-only value (midnight UTC) means that calendar day; otherwise use the Eastern date of the tip-off
  const start = new Date(startDate);
  const dateOnly = start.getUTCHours() === 0 && start.getUTCMinutes() === 0;
  const firstRound = dateOnly ? start.toISOString().slice(0, 10).replace(/-/g, "") : easternDate(start);
  return SCHEDULE.map(([offset, round]) => {
    const date = shiftDate(firstRound, offset);
    const d = new Date(Date.UTC(+date.slice(0, 4), +date.slice(4, 6) - 1, +date.slice(6, 8), 12));
    const label = d.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });
    return { date, label, round };
  });
}

/** Today if it's a game day, otherwise the next game day (or the last one once the tournament is over) */
export function defaultDay(days: LiveDay[], today: string): string {
  return days.find((d) => d.date >= today)?.date ?? days[days.length - 1].date;
}
