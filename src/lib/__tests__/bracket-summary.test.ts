import { describe, expect, it } from "vitest";
import type { BracketPick } from "@/lib/bracket-validation";
import { boldPicks, compareBrackets, summarizeBracket } from "@/lib/bracket-summary";

const REGIONS = ["East", "South", "West", "Midwest"];
const pick = (gameId: string, round: number, ...choices: string[]): BracketPick => ({ gameId, round, choices });

describe("summarizeBracket", () => {
  const picks = [
    pick("East-r1-g1", 1, "east-1"),
    pick("East-r1-g2", 1, "east-8"),
    pick("East-r3-g1", 3, "east-1", "east-4"),
    pick("West-r4-g1", 4, "west-2", "west-1", "west-3"),
    pick("East-r4-g1", 4, "east-1", "east-2", "east-3"),
    pick("championship-r6-g1", 6, "east-1", "west-2", "west-1", "south-1", "east-2"),
  ];
  const winners = new Map([
    ["East-r1-g1", "east-1"],
    ["East-r1-g2", "east-9"],
    ["East-r3-g1", "east-4"],
  ]);
  const eliminated = new Set(["east-16", "east-8", "east-1", "west-3"]);
  const s = summarizeBracket(picks, winners, eliminated, REGIONS);

  it("splits each round into earned, gone, and still possible", () => {
    const [r1, , r3, r4, , r6] = s.rounds;
    expect(r1).toMatchObject({ max: 64, earned: 2, decided: 2, firstChoiceRight: 1 });
    expect(r1.gone).toBe(64 - 2);
    expect(r3).toMatchObject({ earned: 5, possible: 0, gone: 80 - 5, firstChoiceRight: 0 });
    // East 1 is out: East E8 falls back to the 2nd choice (10); West E8 1st choice alive (15)
    expect(r4).toMatchObject({ earned: 0, possible: 25, gone: 60 - 25 });
    // Champion pick East 1 is out: falls back to West 2 (25)
    expect(r6).toMatchObject({ possible: 25, gone: 10 });
    for (const r of s.rounds) expect(r.earned + r.possible + r.gone).toBe(r.max);
  });

  it("reports totals and the champion / Final Four status", () => {
    expect(s.score).toBe(7);
    expect(s.max).toBe(7 + 25 + 25);
    expect(s.inPlay).toBe(50);
    expect(s.champion).toEqual({ team: "east-1", state: "out" });
    expect(s.finalFour).toEqual([
      { team: "east-1", state: "out" },
      { team: "west-2", state: "pending" },
    ]);
  });
});

describe("compareBrackets", () => {
  const mine = [
    pick("championship-r6-g1", 6, "midwest-1", "south-2", "west-2", "west-1", "east-2"),
    pick("West-r4-g1", 4, "west-2", "west-1", "west-3"),
    pick("East-r1-g1", 1, "east-1"),
    pick("South-r4-g1", 4, "south-3", "south-1", "south-2"),
  ];
  const theirs = [
    pick("championship-r6-g1", 6, "west-1", "east-1", "west-2", "midwest-1", "south-1"),
    pick("West-r4-g1", 4, "west-1", "west-2", "south-9"),
    pick("East-r1-g1", 1, "east-1"),
    pick("South-r4-g1", 4, "south-3", "south-1", "south-2"),
  ];
  const winners = new Map([["East-r1-g1", "east-1"]]);
  const c = compareBrackets(mine, theirs, winners, new Set(["south-2"]));

  it("lists only games that can score differently, biggest gain first", () => {
    expect(c.diffs.map((d) => [d.gameId, d.rootFor, d.myPoints, d.theirPoints, d.gain])).toEqual([
      ["championship-r6-g1", "midwest-1", 35, 10, 25],
      ["West-r4-g1", "west-2", 15, 10, 5],
    ]);
    expect(c.upside).toBe(30);
  });

  it("says who to root against when every pick in play helps them more", () => {
    const r = compareBrackets([pick("South-r4-g1", 4, "south-2", "south-1", "south-3")], [pick("South-r4-g1", 4, "south-1", "south-3")], new Map(), new Set(["south-2"]));
    expect(r.diffs[0]).toMatchObject({ rootFor: null, rootAgainst: "south-3", myPoints: 5, theirPoints: 10, gain: -5 });
  });

  it("counts decided games where you scored the same", () => {
    expect(c).toMatchObject({ matchedDecided: 1, decided: 1 });
  });
});

describe("boldPicks", () => {
  const picks = [pick("West-r4-g1", 4, "west-2", "west-1"), pick("East-r3-g1", 3, "east-4", "east-1"), pick("South-r4-g1", 4, "south-1"), pick("Midwest-r4-g1", 4, "midwest-6")];
  const pct = { "West-r4-g1": { "0:west-2": 12 }, "East-r3-g1": { "0:east-4": 8 }, "South-r4-g1": { "0:south-1": 60 }, "Midwest-r4-g1": { "0:midwest-6": 3 } };

  it("finds rare 1st choices still alive and the ones that paid off", () => {
    const b = boldPicks(picks, pct, new Map([["East-r3-g1", "east-4"]]), new Set(["midwest-6"]));
    expect(b.alive.map((p) => [p.team, p.pct, p.points])).toEqual([["west-2", 12, 15]]);
    expect(b.paidOff.map((p) => [p.team, p.pct, p.points])).toEqual([["east-4", 8, 10]]);
  });
});
