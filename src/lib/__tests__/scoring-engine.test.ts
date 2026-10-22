import { describe, expect, it } from "vitest";
import type { BracketPick } from "@/lib/bracket-validation";
import {
  actualTiebreaker,
  buildBracketGameMap,
  buildTeamKeyMaps,
  finalWinners,
  parsePicksData,
  rankEntries,
  scoreBracket,
  withLiveLeaders,
  type EngineGame,
  type Winners,
} from "@/lib/scoring-engine";

const pick = (gameId: string, round: number, ...choices: string[]): BracketPick => ({ gameId, round, choices });
const winners = (entries: Record<string, string>): Winners => new Map(Object.entries(entries));

describe("scoreBracket", () => {
  it("awards round points for correct single-choice picks", () => {
    const picks = [pick("East-r1-g1", 1, "east-1"), pick("East-r2-g1", 2, "east-1"), pick("East-r1-g2", 1, "east-8")];
    const result = scoreBracket(picks, winners({ "East-r1-g1": "east-1", "East-r2-g1": "east-1", "East-r1-g2": "east-9" }));
    expect(result.total).toBe(2 + 5);
  });

  it("awards points for the rank of the choice that won (multi-choice)", () => {
    const sweet16 = pick("East-r3-g1", 3, "east-1", "east-4");
    expect(scoreBracket([sweet16], winners({ "East-r3-g1": "east-1" })).total).toBe(10);
    expect(scoreBracket([sweet16], winners({ "East-r3-g1": "east-4" })).total).toBe(5);
    expect(scoreBracket([sweet16], winners({ "East-r3-g1": "east-5" })).total).toBe(0);

    const championship = pick("championship-r6-g1", 6, "east-1", "south-1", "west-1", "midwest-1", "east-2");
    expect(scoreBracket([championship], winners({ "championship-r6-g1": "midwest-1" })).games[0]).toMatchObject({
      points: 10,
      matchedRank: 4,
    });
  });

  it("ignores undecided games", () => {
    expect(scoreBracket([pick("East-r1-g1", 1, "east-1")], new Map()).total).toBe(0);
  });

  it("ignores choices beyond the round's allowed number", () => {
    expect(scoreBracket([pick("East-r1-g1", 1, "east-16", "east-1")], winners({ "East-r1-g1": "east-1" })).total).toBe(0);
  });

  describe("Final Four bonus", () => {
    const eliteEight = [
      pick("East-r4-g1", 4, "east-1", "east-2", "east-3"),
      pick("South-r4-g1", 4, "south-1", "south-2", "south-3"),
      pick("West-r4-g1", 4, "west-1", "west-2", "west-3"),
      pick("Midwest-r4-g1", 4, "midwest-1", "midwest-2", "midwest-3"),
    ];
    const allFirstChoices = { "East-r4-g1": "east-1", "South-r4-g1": "south-1", "West-r4-g1": "west-1", "Midwest-r4-g1": "midwest-1" };

    it("adds +10 when all four Elite 8 first choices win", () => {
      const result = scoreBracket(eliteEight, winners(allFirstChoices));
      expect(result).toMatchObject({ total: 60, bonus: 10 });
    });

    it("no bonus when one winner was only a 2nd choice", () => {
      const result = scoreBracket(eliteEight, winners({ ...allFirstChoices, "West-r4-g1": "west-2" }));
      expect(result).toMatchObject({ total: 55, bonus: 0 });
    });

    it("no bonus until all four Elite 8 games are decided", () => {
      const { "Midwest-r4-g1": _, ...three } = allFirstChoices;
      expect(scoreBracket(eliteEight, winners(three)).bonus).toBe(0);
    });
  });
});

describe("withLiveLeaders (live projection)", () => {
  const sweet16 = pick("East-r3-g1", 3, "east-1", "east-4");
  const live = (score1: number, score4: number) => [
    { gameId: "East-r3-g1", team1: "east-1", team2: "east-4", team1Score: score1, team2Score: score4 },
  ];

  it("credits the 2nd choice while the 1st choice is trailing", () => {
    expect(scoreBracket([sweet16], withLiveLeaders(new Map(), live(30, 35))).total).toBe(5);
  });

  it("switches to 1st-choice points when the lead flips", () => {
    expect(scoreBracket([sweet16], withLiveLeaders(new Map(), live(50, 48))).total).toBe(10);
  });

  it("gives no provisional points for a tied game", () => {
    expect(scoreBracket([sweet16], withLiveLeaders(new Map(), live(40, 40))).total).toBe(0);
  });

  it("never overrides a final result", () => {
    const finals = winners({ "East-r3-g1": "east-4" });
    expect(withLiveLeaders(finals, live(60, 10)).get("East-r3-g1")).toBe("east-4");
  });
});

describe("rankEntries", () => {
  const entry = (id: string, score: number, tiebreaker: number | null) => ({ id, score, tiebreaker });

  it("ranks by score and shares ranks on ties when the actual total is unknown", () => {
    const ranked = rankEntries([entry("a", 280, 140), entry("b", 301, 150), entry("c", 280, 130)], null);
    expect(ranked.map((e) => [e.id, e.rank])).toEqual([["b", 1], ["a", 2], ["c", 2]]);
  });

  it("breaks ties by closest tiebreaker (either direction) once the actual total is known", () => {
    const ranked = rankEntries([entry("over", 280, 135), entry("under", 280, 127), entry("top", 290, 100)], 132);
    expect(ranked.map((e) => [e.id, e.rank])).toEqual([["top", 1], ["over", 2], ["under", 3]]);
  });

  it("keeps a shared rank when tiebreakers are equally close", () => {
    const ranked = rankEntries([entry("a", 280, 130), entry("b", 280, 134), entry("c", 200, 132)], 132);
    expect(ranked.map((e) => e.rank)).toEqual([1, 1, 3]);
  });

  it("puts missing tiebreakers after any prediction", () => {
    const ranked = rankEntries([entry("none", 280, null), entry("far", 280, 400)], 132);
    expect(ranked.map((e) => e.id)).toEqual(["far", "none"]);
  });
});

describe("database mapping", () => {
  const game = (id: string, round: number, gameNumber: number, region: string | null, winnerId: string | null = null): EngineGame => ({
    id,
    round,
    gameNumber,
    region,
    status: winnerId ? "FINAL" : "SCHEDULED",
    winnerId,
  });

  it("numbers regional games per region in gameNumber order", () => {
    const map = buildBracketGameMap([game("m26", 1, 26, "Midwest"), game("m25", 1, 25, "Midwest"), game("e1", 1, 1, "East")]);
    expect(map.get("Midwest-r1-g1")?.id).toBe("m25");
    expect(map.get("Midwest-r1-g2")?.id).toBe("m26");
    expect(map.get("East-r1-g1")?.id).toBe("e1");
  });

  it("maps national games and final winners to team keys", () => {
    const { idToKey } = buildTeamKeyMaps([{ id: "tt-duke", seed: 1, region: "East" }]);
    const map = buildBracketGameMap([game("ff1", 5, 1, null, "tt-duke"), game("ch", 6, 1, null)]);
    expect(finalWinners(map, idToKey)).toEqual(new Map([["final-four-r5-g1", "east-1"]]));
  });

  it("derives the actual tiebreaker from the championship score unless overridden", () => {
    const map = buildBracketGameMap([{ ...game("ch", 6, 1, null, "x"), team1Score: 69, team2Score: 63 }]);
    expect(actualTiebreaker(null, map)).toBe(132);
    expect(actualTiebreaker(140, map)).toBe(140);
    expect(actualTiebreaker(null, buildBracketGameMap([game("ch", 6, 1, null)]))).toBeNull();
  });

  it("treats malformed picksData as an empty bracket", () => {
    expect(parsePicksData("not json")).toEqual([]);
    expect(parsePicksData(null)).toEqual([]);
  });
});
