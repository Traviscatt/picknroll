import { SCORING_RULES } from "@/lib/scoring";

const ROUND_NAME: Record<number, string> = { 1: "Round 1", 2: "Round 2", 3: "Sweet 16", 4: "Elite 8", 5: "Final Four", 6: "Championship" };

/** "Championship", "Final Four · East vs South", "Elite 8 · West", "Round 1 · East" */
export function gameLabel(gameId: string, regions: string[]): string {
  if (gameId.startsWith("championship")) return "Championship";
  const ff = gameId.match(/^final-four-r5-g(\d)$/);
  if (ff) {
    const n = Number(ff[1]);
    return `Final Four · ${regions[(n - 1) * 2] ?? ""} vs ${regions[(n - 1) * 2 + 1] ?? ""}`;
  }
  const m = gameId.match(/^(.+)-r(\d)-g\d+$/);
  return m ? `${ROUND_NAME[Number(m[2])]} · ${m[1]}` : gameId;
}

export const roundPoints = (round: number) => SCORING_RULES.find((r) => r.round === round)?.pointsPerChoice ?? [];
