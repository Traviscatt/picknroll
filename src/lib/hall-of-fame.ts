// Hall of Fame: each season's podium. Seasons played in the app are computed from final standings;
// earlier seasons come from HallOfFameEntry rows an admin enters (and those also override a computed year).
import { db } from "@/lib/db";
import { getActualTiebreaker, rankBrackets, SCORED_STATUSES } from "@/lib/scoring-service";

export interface PodiumSpot {
  place: number;
  name: string;
  bracketName: string | null;
  score: number | null;
  note: string | null;
}

export interface HallOfFameSeason {
  year: number;
  poolName: string | null;
  source: "app" | "manual";
  entries: number | null;
  podium: PodiumSpot[];
}

export interface HallOfFameLeader {
  name: string;
  titles: number;
  podiums: number;
  years: number[];
}

/** Podiums for finished app seasons (championship final) */
async function appSeasons(): Promise<HallOfFameSeason[]> {
  const tournaments = await db.tournament.findMany({
    where: { games: { some: { round: 6, status: "FINAL", winnerId: { not: null } } } },
    select: { id: true, year: true, pools: { select: { id: true, name: true } } },
  });
  const seasons: HallOfFameSeason[] = [];
  for (const t of tournaments) {
    const actual = await getActualTiebreaker(t.id);
    for (const pool of t.pools) {
      const brackets = await db.bracket.findMany({
        where: { poolId: pool.id, status: { in: SCORED_STATUSES } },
        select: { id: true, name: true, entryName: true, totalScore: true, bonusScore: true, tiebreaker: true },
      });
      if (!brackets.length) continue;
      const podium = rankBrackets(brackets, actual)
        .filter((b) => b.rank <= 3)
        .map((b) => ({ place: b.rank, name: b.entryName, bracketName: b.name, score: b.score, note: null }));
      seasons.push({ year: t.year, poolName: t.pools.length > 1 ? pool.name : null, source: "app", entries: brackets.length, podium });
    }
  }
  return seasons;
}

const normalize = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

export async function hallOfFame(): Promise<{ seasons: HallOfFameSeason[]; leaders: HallOfFameLeader[] }> {
  const [computed, manual] = await Promise.all([appSeasons(), db.hallOfFameEntry.findMany({ orderBy: [{ year: "desc" }, { place: "asc" }] })]);
  const manualYears = new Set(manual.map((m) => m.year));
  const manualSeasons: HallOfFameSeason[] = [...manualYears].map((year) => ({
    year,
    poolName: null,
    source: "manual",
    entries: null,
    podium: manual.filter((m) => m.year === year).map((m) => ({ place: m.place, name: m.name, bracketName: null, score: m.score, note: m.note })),
  }));
  const seasons = [...manualSeasons, ...computed.filter((s) => !manualYears.has(s.year))].sort((a, b) => b.year - a.year);

  const leaders = new Map<string, HallOfFameLeader>();
  for (const season of seasons) {
    for (const spot of season.podium) {
      const key = normalize(spot.name);
      const leader = leaders.get(key) ?? { name: spot.name.trim(), titles: 0, podiums: 0, years: [] };
      if (spot.place === 1) {
        leader.titles++;
        leader.years.push(season.year);
      }
      leader.podiums++;
      leaders.set(key, leader);
    }
  }
  return {
    seasons,
    leaders: [...leaders.values()].sort((a, b) => b.titles - a.titles || b.podiums - a.podiums || a.name.localeCompare(b.name)),
  };
}
