// Database layer for the tournament field.
import { db } from "@/lib/db";
import { getCurrentTournament } from "@/lib/scoring-service";
import { orderedRegions, toFieldTeam, type TournamentField } from "@/lib/tournament-field";

const slotTeamSelect = { name: true, shortName: true, school: true, espnId: true, logo: true, color: true } as const;

/** The field for a tournament, or null if it doesn't exist */
export async function loadField(tournamentId: string): Promise<TournamentField | null> {
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      teams: { include: { team: { select: slotTeamSelect }, playInTeam: { select: slotTeamSelect } } },
    },
  });
  if (!tournament) return null;

  const teams = tournament.teams.map(toFieldTeam);
  const present = [...new Set(teams.map((t) => t.region))];
  return {
    tournament: {
      id: tournament.id,
      name: tournament.name,
      year: tournament.year,
      regions: orderedRegions(tournament.regions, present),
      startDate: tournament.startDate.toISOString(),
    },
    teams: teams.sort((a, b) => a.region.localeCompare(b.region) || a.seed - b.seed),
  };
}

/** Regions in bracket order for a tournament (for validation) */
export async function loadRegions(tournamentId: string): Promise<string[]> {
  const [tournament, slots] = await Promise.all([
    db.tournament.findUnique({ where: { id: tournamentId }, select: { regions: true } }),
    db.tournamentTeam.findMany({ where: { tournamentId }, select: { region: true }, distinct: ["region"] }),
  ]);
  return orderedRegions(tournament?.regions ?? [], slots.map((s) => s.region));
}

/** Tournament ID for a pool, or the current tournament when there's no pool */
export async function tournamentIdForPool(poolId: string | null | undefined): Promise<string | null> {
  if (poolId) {
    const pool = await db.pool.findUnique({ where: { id: poolId }, select: { tournamentId: true } });
    if (pool) return pool.tournamentId;
  }
  return (await getCurrentTournament())?.id ?? null;
}

/** Bracket regions for a pool's tournament (current tournament when there's no pool) */
export async function regionsForPool(poolId: string | null | undefined): Promise<string[]> {
  const tournamentId = await tournamentIdForPool(poolId);
  return tournamentId ? loadRegions(tournamentId) : [];
}
