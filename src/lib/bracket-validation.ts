import { z } from "zod";
import { SCORING_RULES } from "@/lib/scoring";

// Bracket structure shared by the API (validation) and scoring.
// Game IDs: "East-r1-g1" ... "Midwest-r4-g1", "final-four-r5-g1|2", "championship-r6-g1".
// Team IDs: "<region>-<seed>", e.g. "east-1".
export const REGIONS = ["East", "South", "West", "Midwest"] as const;

// First-round seed matchups in bracket order (game 1 = 1 vs 16, game 2 = 8 vs 9, ...)
export const R1_SEED_PAIRS = [[1, 16], [8, 9], [5, 12], [4, 13], [6, 11], [3, 14], [7, 10], [2, 15]];
const GAMES_PER_REGION: Record<number, number> = { 1: 8, 2: 4, 3: 2, 4: 1 };

const teamsInRegions = (regions: readonly string[]) =>
  new Set(regions.flatMap((region) => Array.from({ length: 16 }, (_, i) => `${region.toLowerCase()}-${i + 1}`)));

// Every bracket game with the teams that can structurally reach it
const BRACKET_GAMES = (() => {
  const games = new Map<string, { round: number; teams: Set<string> }>();
  for (const region of REGIONS) {
    for (let round = 1; round <= 4; round++) {
      const gameCount = GAMES_PER_REGION[round];
      const r1GamesPerGame = R1_SEED_PAIRS.length / gameCount;
      for (let g = 1; g <= gameCount; g++) {
        const seeds = R1_SEED_PAIRS.slice((g - 1) * r1GamesPerGame, g * r1GamesPerGame).flat();
        games.set(`${region}-r${round}-g${g}`, {
          round,
          teams: new Set(seeds.map((seed) => `${region.toLowerCase()}-${seed}`)),
        });
      }
    }
  }
  games.set("final-four-r5-g1", { round: 5, teams: teamsInRegions(["East", "South"]) });
  games.set("final-four-r5-g2", { round: 5, teams: teamsInRegions(["West", "Midwest"]) });
  games.set("championship-r6-g1", { round: 6, teams: teamsInRegions(REGIONS) });
  return games;
})();

export const TOTAL_BRACKET_GAMES = BRACKET_GAMES.size;

const pickSchema = z.object({
  gameId: z.string(),
  round: z.number().int(),
  choices: z.array(z.string()),
});

export type BracketPick = z.infer<typeof pickSchema>;

export type PicksValidation = { ok: true; picks: BracketPick[] } | { ok: false; error: string };

/**
 * Validates picks against the bracket structure. Unknown fields are stripped.
 * - Drafts may be partial.
 * - Submitted brackets (`requireComplete`) need every game with the full number of ranked choices.
 */
export function validatePicks(input: unknown, { requireComplete }: { requireComplete: boolean }): PicksValidation {
  const parsed = z.array(pickSchema).max(TOTAL_BRACKET_GAMES).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Picks are not in the expected format." };

  const seen = new Set<string>();
  for (const pick of parsed.data) {
    const game = BRACKET_GAMES.get(pick.gameId);
    if (!game || game.round !== pick.round) return { ok: false, error: `Unknown game: ${pick.gameId}` };
    if (seen.has(pick.gameId)) return { ok: false, error: `Duplicate picks for ${pick.gameId}` };
    seen.add(pick.gameId);

    const maxChoices = SCORING_RULES.find((r) => r.round === pick.round)?.choices ?? 1;
    if (pick.choices.length > maxChoices) return { ok: false, error: `Too many choices for ${pick.gameId}` };
    if (new Set(pick.choices).size !== pick.choices.length) {
      return { ok: false, error: `A team is picked more than once in ${pick.gameId}` };
    }
    if (pick.choices.some((teamId) => !game.teams.has(teamId))) {
      return { ok: false, error: `A picked team can't play in ${pick.gameId}` };
    }
    if (requireComplete && pick.choices.length !== maxChoices) {
      return { ok: false, error: `Bracket incomplete: ${pick.gameId} needs ${maxChoices} choice(s)` };
    }
  }

  if (requireComplete && seen.size !== TOTAL_BRACKET_GAMES) {
    return { ok: false, error: `Bracket incomplete: ${TOTAL_BRACKET_GAMES - seen.size} game(s) missing` };
  }

  return { ok: true, picks: parsed.data };
}

// Request body for creating/updating a bracket. Users can only draft or submit; paid status is admin-only.
export const bracketInputSchema = z.object({
  name: z.string().trim().min(1, "Bracket name is required").max(100).optional(),
  entryName: z.string().trim().min(1).max(100).optional(),
  status: z.enum(["DRAFT", "SUBMITTED"]).optional(),
  tiebreaker: z.number().int().min(0).max(500).nullable().optional(),
  picks: z.unknown().optional(),
  poolId: z.string().nullable().optional(),
  familyMemberId: z.string().nullable().optional(),
});

// Returns why a pool no longer accepts bracket changes, or null if it does
export function poolLockedReason(pool: { status: string; deadline: Date }): string | null {
  if (pool.status !== "OPEN") return "This pool is no longer accepting changes.";
  if (new Date() > pool.deadline) return "The deadline for this pool has passed. Brackets are locked.";
  return null;
}
