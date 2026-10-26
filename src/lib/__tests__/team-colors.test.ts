import { describe, expect, it } from "vitest";
import { contrastRatio, DARK_BACKGROUND, generatePalette, teamSlug, TEAMS } from "@/lib/team-colors";

describe("generatePalette", () => {
  it.each(TEAMS.map((t) => [t.name, t] as const))("%s: frame colors stay readable", (_, team) => {
    const p = generatePalette(team.primary, team.secondary);
    expect(contrastRatio(p.primary, "#ffffff")).toBeGreaterThanOrEqual(4.5); // links / labels on white
    expect(contrastRatio(p["primary-foreground"], p.primary)).toBeGreaterThanOrEqual(4.5); // button text
    expect(contrastRatio(p["team-secondary"], "#ffffff")).toBeGreaterThanOrEqual(2); // underline, logo "N"
    expect(contrastRatio(p["secondary-foreground"], p.secondary)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p["accent-foreground"], p.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p["frame-foreground"], p.frame)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(TEAMS.map((t) => [t.name, t] as const))("%s: dark mode frame colors stay readable", (_, team) => {
    const p = generatePalette(team.primary, team.secondary, "dark");
    expect(contrastRatio(p.primary, DARK_BACKGROUND)).toBeGreaterThanOrEqual(4.5); // links / labels on the dark page
    expect(contrastRatio(p.primary, p.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p["primary-foreground"], p.primary)).toBeGreaterThanOrEqual(4.5); // button text
    expect(contrastRatio(p["team-secondary"], DARK_BACKGROUND)).toBeGreaterThanOrEqual(3); // underline, logo "N"
    expect(contrastRatio(p["secondary-foreground"], p.secondary)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p["accent-foreground"], p.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p["frame-foreground"], p.frame)).toBeGreaterThanOrEqual(4.5); // summary cards
  });

  it("only sets frame variables (text, borders, and muted colors stay neutral)", () => {
    const keys = Object.keys(generatePalette("#003087", "#ffffff"));
    for (const neutral of ["foreground", "muted-foreground", "border", "input", "destructive", "card", "muted"]) expect(keys).not.toContain(neutral);
  });

  it("replaces a white secondary color so accents don't vanish", () => {
    expect(generatePalette("#003087", "#FFFFFF")["team-secondary"].toLowerCase()).not.toBe("#ffffff");
  });
});

describe("teamSlug", () => {
  it("makes URL-safe slugs", () => {
    expect(teamSlug("St. John's")).toBe("st-johns");
    expect(teamSlug("Texas A&M")).toBe("texas-am");
    expect(teamSlug("Miami (OH)")).toBe("miami-oh");
  });
});
