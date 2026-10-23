import { describe, expect, it } from "vitest";
import { parseEspnField } from "@/lib/espn-field";
import fixture from "./fixtures/espn-2026-field.json";

// Real ESPN scoreboard events for the 2026 First Four (Mar 17-18) and Round 1 (Mar 19-20), trimmed
const events = fixture.events;

const slot = (field: ReturnType<typeof parseEspnField>, region: string, seed: number) =>
  field.slots.find((s) => s.region === region && s.seed === seed);

describe("parseEspnField", () => {
  it("builds the full 2026 field", () => {
    const field = parseEspnField(events);
    expect(field.problems).toEqual([]);
    expect(field.regions).toEqual(["East", "South", "West", "Midwest"]);
    expect(field.slots).toHaveLength(64);
    expect(Object.keys(field.r1GameIds)).toHaveLength(32);
    expect(field.startDate).toBe("2026-03-17T22:40Z");
    expect(field.firstRoundTipoff).toBe("2026-03-19T16:15Z");

    expect(slot(field, "East", 1)?.team).toMatchObject({ espnId: "150", school: "Duke", name: "Duke Blue Devils", abbreviation: "DUKE", color: "00539b" });
    expect(slot(field, "East", 1)?.team.record).toMatch(/^\d+-\d+$/);
    expect(slot(field, "West", 16)?.team.school).toBe("Long Island");
  });

  it("puts the First Four winner in the slot once the game is final", () => {
    const field = parseEspnField(events);
    expect(slot(field, "South", 16)).toMatchObject({ team: { school: "Prairie View A&M" }, playIn: null });
    expect(slot(field, "Midwest", 11)).toMatchObject({ team: { school: "Miami (OH)" }, playIn: null });
  });

  it("keeps both First Four teams while the game is undecided", () => {
    const pending = structuredClone(events);
    for (const e of pending) {
      const headline = e.competitions[0].notes[0].headline;
      if (headline.includes("South Region - First Four")) e.status.type.completed = false;
      if (headline.includes("South Region - 1st Round")) {
        for (const c of e.competitions[0].competitors) {
          if (c.curatedRank?.current === 16) Object.assign(c.team, { id: "-1", displayName: "TBD" });
        }
      }
    }
    const field = parseEspnField(pending);
    expect(field.problems).toEqual([]);
    const s16 = slot(field, "South", 16)!;
    expect([s16.team.school, s16.playIn?.school].sort()).toEqual(["Lehigh", "Prairie View A&M"]);
  });

  it("reports missing regions and seeds", () => {
    const eastOnly = events.filter((e) => e.competitions[0].notes[0].headline.includes("East Region"));
    const field = parseEspnField(eastOnly);
    expect(field.problems.some((p) => p.includes("Expected 4 regions"))).toBe(true);
    const withoutDuke = parseEspnField(events.filter((e) => !e.competitions[0].competitors.some((c) => c.team.id === "150")));
    expect(withoutDuke.problems).toContain("East is missing seeds 1, 16.");
  });
});
