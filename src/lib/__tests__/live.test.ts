import { describe, expect, it } from "vitest";
import type { BracketPick } from "@/lib/bracket-validation";
import { parseScoreboardEvent } from "@/lib/espn-live";
import {
  defaultDay,
  easternDate,
  leaderSlot,
  personalSummary,
  pickVerdict,
  rootingFor,
  tonightRange,
  undecidedOutcomes,
  tournamentDays,
  type LiveGame,
  type LivePayload,
  type StandingEntry,
} from "@/lib/live";
import { bracketGameForSlots, losers, maxPossibleScore, poolSplit } from "@/lib/scoring-engine";
import fixture from "./fixtures/espn-2026-field.json";

const REGIONS = ["East", "South", "West", "Midwest"];
const pick = (gameId: string, round: number, ...choices: string[]): BracketPick => ({ gameId, round, choices });

const game = (over: Partial<LiveGame> & { scores?: [number | null, number | null]; winner?: 0 | 1 }): LiveGame => {
  const { scores = [null, null], winner, ...rest } = over;
  return {
    espnId: "1",
    gameId: "East-r3-g1",
    round: 3,
    region: "East",
    state: "pre",
    detail: "",
    startTime: "2026-03-26T23:00Z",
    network: "CBS",
    teams: [
      { slot: "east-1", espnId: "150", name: "Duke", seed: 1, logo: null, score: scores[0], winner: winner === 0 },
      { slot: "east-4", espnId: "2305", name: "Kansas", seed: 4, logo: null, score: scores[1], winner: winner === 1 },
    ],
    poolSplit: null,
    ...rest,
  };
};

describe("bracketGameForSlots", () => {
  it("finds where two teams in a region meet", () => {
    expect(bracketGameForSlots("east-1", "east-16", REGIONS)).toBe("East-r1-g1");
    expect(bracketGameForSlots("east-16", "east-9", REGIONS)).toBe("East-r2-g1");
    expect(bracketGameForSlots("east-3", "east-11", REGIONS)).toBe("East-r2-g3");
    expect(bracketGameForSlots("east-1", "east-4", REGIONS)).toBe("East-r3-g1");
    expect(bracketGameForSlots("east-2", "east-3", REGIONS)).toBe("East-r3-g2");
    expect(bracketGameForSlots("east-1", "east-2", REGIONS)).toBe("East-r4-g1");
  });

  it("uses the tournament's Final Four pairing across regions", () => {
    expect(bracketGameForSlots("east-1", "south-1", REGIONS)).toBe("final-four-r5-g1");
    expect(bracketGameForSlots("midwest-2", "west-1", REGIONS)).toBe("final-four-r5-g2");
    expect(bracketGameForSlots("east-1", "west-1", REGIONS)).toBe("championship-r6-g1");
    expect(bracketGameForSlots("east-1", "west-1", ["East", "West", "South", "Midwest"])).toBe("final-four-r5-g1");
  });

  it("returns null for First Four pairs and unknown regions", () => {
    expect(bracketGameForSlots("south-16", "south-16", REGIONS)).toBeNull();
    expect(bracketGameForSlots("north-1", "east-1", REGIONS)).toBeNull();
  });
});

describe("pool split, losers, max possible", () => {
  it("counts how brackets ranked each team", () => {
    const brackets = [
      [pick("East-r3-g1", 3, "east-1", "east-4")],
      [pick("East-r3-g1", 3, "east-4", "east-1")],
      [pick("East-r3-g1", 3, "east-1", "east-5")],
      [],
    ];
    expect(poolSplit(brackets, "East-r3-g1", 3, ["east-1", "east-4"])).toEqual({ total: 4, counts: [[2, 1, 1], [1, 1, 2]] });
  });

  it("finds the losers of decided games", () => {
    expect([...losers([{ team1: "east-1", team2: "east-16", winner: "east-1" }, { team1: "east-8", team2: "east-9", winner: null }])]).toEqual(["east-16"]);
  });

  it("adds the best surviving choice of every undecided game", () => {
    const picks = [pick("East-r1-g1", 1, "east-1"), pick("East-r3-g1", 3, "east-1", "east-4"), pick("East-r4-g1", 4, "east-4", "east-1", "east-2")];
    const winners = new Map([["East-r1-g1", "east-1"]]);
    expect(maxPossibleScore(picks, winners, new Set())).toBe(2 + 10 + 15);
    // East 1 lost later: Sweet 16 falls back to the 2nd choice
    expect(maxPossibleScore(picks, winners, new Set(["east-1"]))).toBe(2 + 5 + 15);
  });
});

describe("pickVerdict", () => {
  const choices = ["east-1", "east-4"];

  it("shows points at stake before tip-off", () => {
    expect(pickVerdict(choices, game({}))).toMatchObject({ tone: "pending", label: "10 / 5 pts at stake" });
    expect(pickVerdict(["east-8", "east-9"], game({}))).toMatchObject({ tone: "zero", label: "No points possible" });
  });

  it("tracks the leader while live", () => {
    expect(pickVerdict(choices, game({ state: "in", scores: [40, 31] }))).toMatchObject({ tone: "holds", label: "+10 if it holds", rank: 1 });
    expect(pickVerdict(choices, game({ state: "half", scores: [34, 36] }))).toMatchObject({ tone: "now", label: "+5 now", rank: 2 });
    expect(pickVerdict(choices, game({ state: "in", scores: [30, 30] }))).toMatchObject({ tone: "pending", label: "Tied" });
    expect(leaderSlot(game({ state: "in", scores: [30, 30] }))).toBeNull();
  });

  it("reports points earned once final", () => {
    expect(pickVerdict(choices, game({ state: "post", scores: [72, 77], winner: 1 }))).toMatchObject({ tone: "earned", label: "+5 earned", rank: 2 });
    expect(pickVerdict(["east-8"], game({ state: "post", scores: [72, 77], winner: 1 }))).toMatchObject({ tone: "zero" });
  });

  it("ignores First Four games", () => {
    expect(pickVerdict(choices, game({ gameId: null, round: 0 }))).toBeNull();
  });
});

describe("rooting", () => {
  const standings: StandingEntry[] = ["You", "Rival", "Other"].map((name, i) => ({
    bracketId: String(i),
    name,
    bracketName: name,
    tiebreaker: null,
    official: 0,
    officialRank: 1,
    live: [100, 105, 90][i],
    liveRank: [2, 1, 3][i],
    max: 300,
  }));
  // Duke win: you +10, rival +0. Kansas win: you +5, rival +10.
  const outcome = { gameId: "East-r3-g1", teams: ["east-1", "east-4"] as [string, string], base: [100, 105, 90], totals: [[110, 105, 100], [105, 115, 90]] as [number[], number[]] };

  it("recommends the result that ranks you higher", () => {
    const r = rootingFor(outcome, 0, standings, null);
    expect(r.options[0]).toMatchObject({ team: "east-1", points: 10, rank: 1 });
    expect(r.options[1]).toMatchObject({ team: "east-4", points: 5, rank: 2 });
    expect(r.recommended).toBe(0);
    expect(r.swing).toBe(1);
    expect(r.options[0].poolAvg).toBeCloseTo(20 / 3);
  });

  it("estimates the day's best and worst case", () => {
    const payload = { standings, outcomes: [outcome], games: [game({})], actualTiebreaker: null } as unknown as LivePayload;
    expect(tonightRange(payload, 0)).toEqual({ best: { rank: 1, points: 110 }, worst: { rank: 2, points: 105 } });
  });

  it("summarizes one bracket's day", () => {
    const live = game({ state: "in", scores: [40, 31] });
    const out = game({ espnId: "2", gameId: "East-r1-g1", round: 1, state: "post", winner: 0 });
    const payload = { standings, outcomes: [outcome], games: [live, out], actualTiebreaker: null } as unknown as LivePayload;
    const picks = new Map([
      ["East-r3-g1", ["east-1", "east-4"]],
      ["East-r1-g1", ["east-16"]],
    ]);
    const summary = personalSummary(payload, "0", picks);
    expect(summary.entry?.name).toBe("You");
    expect(summary.items).toHaveLength(1);
    expect(summary.rootings.get("East-r3-g1")).toEqual(rootingFor(outcome, 0, standings, null));
    expect(summary).toMatchObject({ biggestSwing: 1, highlightGame: "1", alive: { total: 2, alive: 1 }, range: tonightRange(payload, 0) });
    expect(personalSummary(payload, "missing", picks)).toMatchObject({ index: -1, entry: null, items: [], biggestSwing: 0, range: null });
  });
});

describe("undecidedOutcomes", () => {
  it("scores every bracket under both results of each undecided game", () => {
    const brackets = [[pick("East-r3-g1", 3, "east-1", "east-4")], [pick("East-r3-g1", 3, "east-4", "east-1")]];
    const live = new Map([["East-r3-g1", "east-4"]]); // Kansas leading
    const outcomes = undecidedOutcomes(brackets, live, new Map(), [game({ state: "in", scores: [30, 34] })]);
    expect(outcomes).toEqual([{ gameId: "East-r3-g1", teams: ["east-1", "east-4"], base: [0, 0], totals: [[10, 5], [5, 10]] }]);
  });

  it("skips final and First Four games", () => {
    expect(undecidedOutcomes([[]], new Map(), new Map(), [game({ state: "post", winner: 0 }), game({ gameId: null, round: 0 })])).toEqual([]);
    expect(undecidedOutcomes([[]], new Map(), new Map([["East-r3-g1", "east-1"]]), [game({})])).toEqual([]);
  });
});

describe("schedule", () => {
  it("lays out the tournament days from the first Round 1 tip-off", () => {
    const days = tournamentDays("2026-03-19T16:15:00.000Z");
    expect(days[0]).toEqual({ date: "20260317", label: "Tue, Mar 17", round: "First Four" });
    expect(days[2].date).toBe("20260319");
    expect(days.at(-1)).toEqual({ date: "20260406", label: "Mon, Apr 6", round: "Championship" });
    expect(defaultDay(days, "20261023")).toBe("20260406");
    expect(defaultDay(days, "20260322")).toBe("20260322");
    expect(defaultDay(days, "20260324")).toBe("20260326");
  });

  it("treats a date-only start (midnight UTC) as that calendar day", () => {
    expect(tournamentDays("2026-03-19T00:00:00.000Z")[2].date).toBe("20260319");
  });

  it("uses US Eastern dates", () => {
    expect(easternDate(new Date("2026-03-20T03:30:00Z"))).toBe("20260319");
  });
});

describe("parseScoreboardEvent", () => {
  const raw = fixture.events.find((e) => e.competitions[0].notes[0].headline.includes("East Region - 1st Round"))!;

  it("reads a final game", () => {
    const event = parseScoreboardEvent(raw)!;
    expect(event).toMatchObject({ round: 1, region: "East", state: "post" });
    expect(event.competitors.every((c) => typeof c.score === "number" && c.seed)).toBe(true);
  });

  it("reads live, halftime, and upcoming states", () => {
    const live = structuredClone(raw) as typeof raw & { status: { type: Record<string, unknown> } };
    live.status.type = { state: "in", name: "STATUS_IN_PROGRESS", shortDetail: "12:34 - 2nd Half", completed: false };
    expect(parseScoreboardEvent(live)).toMatchObject({ state: "in", detail: "12:34 - 2nd Half" });
    live.status.type = { state: "in", name: "STATUS_HALFTIME", shortDetail: "Halftime", completed: false };
    expect(parseScoreboardEvent(live)?.state).toBe("half");
    live.status.type = { state: "pre", name: "STATUS_SCHEDULED", shortDetail: "3/19 - 12:15 PM EDT", completed: false };
    expect(parseScoreboardEvent(live)?.competitors.map((c) => c.score)).toEqual([null, null]);
  });

  it("ignores non-tournament events", () => {
    const other = structuredClone(raw);
    other.competitions[0].notes = [];
    expect(parseScoreboardEvent(other)).toBeNull();
  });
});
