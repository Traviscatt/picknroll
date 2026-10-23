import { describe, expect, it } from "vitest";
import {
  applyTap,
  bracketGames,
  eligibleTeams,
  inconsistentChoices,
  isUnlocked,
  phoneSteps,
  progress,
  pruneImpossible,
  reorderChoices,
  type Picks,
} from "@/lib/picker";

const REGIONS = ["East", "South", "West", "Midwest"];
const games = bracketGames(REGIONS);
const byId = new Map(games.map((g) => [g.gameId, g]));
const g = (id: string) => byId.get(id)!;
const picksOf = (entries: Record<string, string[]>): Picks =>
  new Map(Object.entries(entries).map(([gameId, choices]) => [gameId, { gameId, round: g(gameId).round, choices }]));

describe("bracket structure", () => {
  it("has 63 games with feeders", () => {
    expect(games).toHaveLength(63);
    expect(g("East-r3-g2").feeders).toEqual(["East-r2-g3", "East-r2-g4"]);
    expect(g("final-four-r5-g2").feeders).toEqual(["West-r4-g1", "Midwest-r4-g1"]);
    expect(g("championship-r6-g1").feeders).toEqual(["final-four-r5-g1", "final-four-r5-g2"]);
  });

  it("splits Round 1 into pods whose winners meet in Round 2", () => {
    const steps = phoneSteps(games);
    expect(steps.filter((s) => s.round === 1)).toHaveLength(16);
    expect(steps[1].games.map((x) => x.gameId)).toEqual(["East-r1-g3", "East-r1-g4"]);
    expect(steps[16].games[0].gameId).toBe("East-r2-g1");
    expect(steps).toHaveLength(16 + 31);
  });
});

describe("eligibleTeams", () => {
  it("follows the bracket rules for each round", () => {
    expect(eligibleTeams(g("East-r1-g2"), new Map())).toEqual(["east-8", "east-9"]);
    expect(eligibleTeams(g("East-r2-g1"), new Map())).toEqual(["east-1", "east-16", "east-8", "east-9"]);
    const picks = picksOf({ "East-r2-g1": ["east-9"], "East-r2-g2": ["east-4"], "East-r3-g1": ["east-9", "east-4"], "East-r3-g2": ["east-2", "east-3"] });
    expect(eligibleTeams(g("East-r3-g1"), picks)).toEqual(["east-9", "east-4"]);
    expect(eligibleTeams(g("East-r4-g1"), picks)).toEqual(["east-9", "east-4", "east-2", "east-3"]);
  });

  it("opens a game once its feeder games are complete", () => {
    expect(isUnlocked(g("East-r2-g1"), new Map(), byId)).toBe(true);
    expect(isUnlocked(g("East-r3-g1"), picksOf({ "East-r2-g1": ["east-1"] }), byId)).toBe(false);
    expect(isUnlocked(g("East-r3-g1"), picksOf({ "East-r2-g1": ["east-1"], "East-r2-g2": ["east-4"] }), byId)).toBe(true);
  });
});

describe("applyTap", () => {
  it("selects, replaces, and clears single-choice picks", () => {
    let r = applyTap(new Map(), g("East-r1-g1"), "east-1");
    expect(r.result).toBe("set");
    r = applyTap(r.picks, g("East-r1-g1"), "east-16");
    expect([r.result, r.picks.get("East-r1-g1")?.choices]).toEqual(["replaced", ["east-16"]]);
    r = applyTap(r.picks, g("East-r1-g1"), "east-16");
    expect([r.result, r.picks.has("East-r1-g1")]).toEqual(["removed", false]);
  });

  it("ranks in tap order, moves later ranks up on removal, and refuses when full", () => {
    const game = g("East-r3-g1");
    let r = applyTap(new Map(), game, "east-1");
    r = applyTap(r.picks, game, "east-4");
    expect(r.picks.get(game.gameId)?.choices).toEqual(["east-1", "east-4"]);
    const full = applyTap(r.picks, game, "east-8");
    expect(full.result).toBe("full");
    expect(full.picks).toBe(r.picks);
    r = applyTap(r.picks, game, "east-1");
    expect(r.picks.get(game.gameId)?.choices).toEqual(["east-4"]);
  });

  it("reorders only the same teams", () => {
    const picks = picksOf({ "East-r3-g1": ["east-1", "east-4"] });
    expect(reorderChoices(picks, g("East-r3-g1"), ["east-4", "east-1"]).get("East-r3-g1")?.choices).toEqual(["east-4", "east-1"]);
    expect(reorderChoices(picks, g("East-r3-g1"), ["east-4", "east-8"])).toBe(picks);
  });
});

describe("pruneImpossible", () => {
  it("clears later choices that a changed pick made impossible, cascading forward", () => {
    const picks = picksOf({
      "East-r2-g1": ["east-8"], // changed from East 1
      "East-r2-g2": ["east-4"],
      "East-r2-g3": ["east-3"],
      "East-r2-g4": ["east-2"],
      "East-r3-g1": ["east-1", "east-4"],
      "East-r3-g2": ["east-2", "east-3"],
      "East-r4-g1": ["east-1", "east-2", "east-4"],
    });
    const { picks: next, removed } = pruneImpossible(picks, games);
    expect(next.get("East-r3-g1")?.choices).toEqual(["east-4"]);
    expect(next.get("East-r4-g1")?.choices).toEqual(["east-2", "east-4"]);
    expect(removed).toEqual([
      { gameId: "East-r3-g1", teamId: "east-1" },
      { gameId: "East-r4-g1", teamId: "east-1" },
    ]);
    expect(inconsistentChoices([...next.values()], REGIONS)).toEqual([]);
  });
});

describe("progress", () => {
  it("counts fully picked games per round", () => {
    const p = progress(picksOf({ "East-r1-g1": ["east-1"], "East-r3-g1": ["east-1"] }), games);
    expect(p.byRound.get(1)).toEqual({ done: 1, total: 32 });
    expect(p.byRound.get(3)).toEqual({ done: 0, total: 8 });
    expect([p.done, p.total]).toEqual([1, 63]);
  });
});
