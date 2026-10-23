import { describe, expect, it } from "vitest";
import { R1_SEED_PAIRS, TOTAL_BRACKET_GAMES, validatePicks as validate, type BracketPick } from "@/lib/bracket-validation";

const REGIONS = ["East", "South", "West", "Midwest"];
const validatePicks = (input: unknown, opts: { requireComplete: boolean }) => validate(input, { ...opts, regions: REGIONS });

// A complete, valid bracket where the higher seed always wins
function chalkBracket(): BracketPick[] {
  const picks: BracketPick[] = [];
  for (const region of REGIONS) {
    const r = region.toLowerCase();
    R1_SEED_PAIRS.forEach(([a], i) => picks.push({ gameId: `${region}-r1-g${i + 1}`, round: 1, choices: [`${r}-${a}`] }));
    [1, 4, 3, 2].forEach((s, i) => picks.push({ gameId: `${region}-r2-g${i + 1}`, round: 2, choices: [`${r}-${s}`] }));
    picks.push({ gameId: `${region}-r3-g1`, round: 3, choices: [`${r}-1`, `${r}-4`] });
    picks.push({ gameId: `${region}-r3-g2`, round: 3, choices: [`${r}-2`, `${r}-3`] });
    picks.push({ gameId: `${region}-r4-g1`, round: 4, choices: [`${r}-1`, `${r}-2`, `${r}-3`] });
  }
  picks.push({ gameId: "final-four-r5-g1", round: 5, choices: ["east-1", "south-1", "east-2", "south-2"] });
  picks.push({ gameId: "final-four-r5-g2", round: 5, choices: ["west-1", "midwest-1", "west-2", "midwest-2"] });
  picks.push({ gameId: "championship-r6-g1", round: 6, choices: ["east-1", "west-1", "south-1", "midwest-1", "east-2"] });
  return picks;
}

describe("validatePicks", () => {
  it("accepts a complete bracket for submission", () => {
    const picks = chalkBracket();
    expect(picks).toHaveLength(TOTAL_BRACKET_GAMES);
    expect(validatePicks(picks, { requireComplete: true }).ok).toBe(true);
  });

  it("accepts a partial draft but rejects it for submission", () => {
    const partial = chalkBracket().slice(0, 10);
    expect(validatePicks(partial, { requireComplete: false }).ok).toBe(true);
    expect(validatePicks(partial, { requireComplete: true })).toMatchObject({ ok: false });
  });

  it("allows any of the four teams in a Round 2 game", () => {
    const picks = chalkBracket();
    // East 13 lost in your Round 1 pick (4 vs 13), but Round 2 doesn't depend on Round 1 picks
    picks.find((p) => p.gameId === "East-r2-g2")!.choices = ["east-13"];
    picks.find((p) => p.gameId === "East-r3-g1")!.choices = ["east-1", "east-13"];
    expect(validatePicks(picks, { requireComplete: true }).ok).toBe(true);
  });

  it("rejects a team that can't reach the game", () => {
    const picks = chalkBracket();
    picks.find((p) => p.gameId === "East-r1-g1")!.choices = ["east-8"];
    expect(validatePicks(picks, { requireComplete: false })).toMatchObject({ ok: false });
  });

  it("rejects too many or duplicate choices", () => {
    expect(validatePicks([{ gameId: "East-r1-g1", round: 1, choices: ["east-1", "east-16"] }], { requireComplete: false }).ok).toBe(false);
    expect(validatePicks([{ gameId: "East-r3-g1", round: 3, choices: ["east-1", "east-1"] }], { requireComplete: false }).ok).toBe(false);
  });

  it("rejects unknown games, mismatched rounds, and duplicate games", () => {
    expect(validatePicks([{ gameId: "East-r1-g9", round: 1, choices: [] }], { requireComplete: false }).ok).toBe(false);
    expect(validatePicks([{ gameId: "East-r1-g1", round: 2, choices: [] }], { requireComplete: false }).ok).toBe(false);
    const dup = { gameId: "East-r1-g1", round: 1, choices: ["east-1"] };
    expect(validatePicks([dup, dup], { requireComplete: false }).ok).toBe(false);
  });

  it("strips unknown fields", () => {
    const result = validatePicks([{ gameId: "East-r1-g1", round: 1, choices: ["east-1"], extra: "x" }], { requireComplete: false });
    expect(result.ok && result.picks[0]).toEqual({ gameId: "East-r1-g1", round: 1, choices: ["east-1"] });
  });

  it("uses the tournament's regions and Final Four pairing", () => {
    // Same bracket, but this year East meets West and South meets Midwest
    const picks = chalkBracket();
    const regions = ["East", "West", "South", "Midwest"];
    expect(validate(picks, { requireComplete: true, regions }).ok).toBe(false);
    picks.find((p) => p.gameId === "final-four-r5-g1")!.choices = ["east-1", "west-1", "east-2", "west-2"];
    picks.find((p) => p.gameId === "final-four-r5-g2")!.choices = ["south-1", "midwest-1", "south-2", "midwest-2"];
    expect(validate(picks, { requireComplete: true, regions }).ok).toBe(true);
  });

  it("rejects a submitted bracket whose later picks don't come from earlier ones", () => {
    const picks = chalkBracket();
    picks.find((p) => p.gameId === "East-r2-g1")!.choices = ["east-8"]; // Sweet 16 still has East 1
    expect(validatePicks(picks, { requireComplete: false }).ok).toBe(true); // drafts may be mid-edit
    expect(validatePicks(picks, { requireComplete: true })).toMatchObject({ ok: false, error: expect.stringContaining("East-r3-g1") });
  });

  it("rejects picks when the tournament has no bracket yet", () => {
    expect(validate([], { requireComplete: false, regions: [] }).ok).toBe(false);
  });
});
