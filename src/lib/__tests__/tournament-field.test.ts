import { describe, expect, it } from "vitest";
import { createFieldLookup, finalFourPairs, orderedRegions, toFieldTeam } from "@/lib/tournament-field";

const team = (school: string | null, name: string, espnId: string) => ({
  name,
  shortName: name.slice(0, 4).toUpperCase(),
  school,
  espnId,
  logo: `https://a.espncdn.com/i/teamlogos/ncaa/500/${espnId}.png`,
  color: null,
});

describe("tournament field", () => {
  it("uses the school name, falling back to the full name", () => {
    expect(toFieldTeam({ seed: 1, region: "East", record: "32-2", team: team("Duke", "Duke Blue Devils", "150"), playInTeam: null })).toMatchObject({
      id: "east-1",
      name: "Duke",
      fullName: "Duke Blue Devils",
      record: "32-2",
      playIn: null,
    });
    expect(toFieldTeam({ seed: 2, region: "East", record: null, team: team(null, "UConn Huskies", "41"), playInTeam: null }).name).toBe("UConn Huskies");
  });

  it("shows both teams while a First Four game is undecided", () => {
    const slot = toFieldTeam({
      seed: 16,
      region: "South",
      record: null,
      team: team("Lehigh", "Lehigh Mountain Hawks", "2329"),
      playInTeam: team("Prairie View A&M", "Prairie View A&M Panthers", "2504"),
    });
    expect(slot.name).toBe("Lehigh / Prairie View A&M");
    expect(slot.playIn).toMatchObject({ name: "Prairie View A&M", espnId: "2504" });
  });

  it("orders regions, falling back to the standard order", () => {
    expect(orderedRegions(["East", "West", "South", "Midwest"], [])).toEqual(["East", "West", "South", "Midwest"]);
    expect(orderedRegions([], ["Midwest", "West", "East", "South"])).toEqual(["East", "South", "West", "Midwest"]);
    expect(finalFourPairs(["East", "West", "South", "Midwest"])).toEqual([["East", "West"], ["South", "Midwest"]]);
  });

  it("looks up teams by slot and lists a region by seed", () => {
    const field = {
      tournament: { id: "t", name: "T", year: 2026, regions: ["East", "South", "West", "Midwest"], startDate: "" },
      teams: [2, 1].map((seed) => toFieldTeam({ seed, region: "East", record: null, team: team(`Team ${seed}`, `Team ${seed}`, String(seed)), playInTeam: null })),
    };
    const lookup = createFieldLookup(field);
    expect(lookup.name("east-1")).toBe("Team 1");
    expect(lookup.name("east-9")).toBe("east-9");
    expect(lookup.region("East").map((t) => t.seed)).toEqual([1, 2]);
  });
});
