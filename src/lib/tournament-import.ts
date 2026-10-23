// Creates or updates a tournament field from an (admin-reviewed) ESPN import.
import { z } from "zod";
import { db } from "@/lib/db";
import { R1_SEED_PAIRS } from "@/lib/bracket-validation";
import { SCORED_STATUSES } from "@/lib/scoring-service";
import { orderedRegions } from "@/lib/tournament-field";

const teamSchema = z.object({
  espnId: z.string().min(1),
  school: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(100),
  abbreviation: z.string().trim().max(10),
  logo: z.string().url().nullable(),
  color: z.string().regex(/^[0-9a-fA-F]{6}$/).nullable(),
  alternateColor: z.string().regex(/^[0-9a-fA-F]{6}$/).nullable(),
  record: z.string().max(20).nullable(),
});

export const publishSchema = z
  .object({
    year: z.number().int().min(2000).max(2100),
    name: z.string().trim().min(1).max(100),
    regions: z.array(z.string().trim().min(1)).length(4),
    startDate: z.string().datetime(),
    slots: z
      .array(z.object({ region: z.string(), seed: z.number().int().min(1).max(16), team: teamSchema, playIn: teamSchema.nullable() }))
      .length(64),
    r1GameIds: z.record(z.string(), z.string()),
  })
  .superRefine((data, ctx) => {
    if (new Set(data.regions).size !== 4) ctx.addIssue({ code: "custom", message: "Regions must be four different names." });
    const keys = new Set(data.slots.map((s) => `${s.region}-${s.seed}`));
    const complete = data.regions.every((r) => Array.from({ length: 16 }, (_, i) => keys.has(`${r}-${i + 1}`)).every(Boolean));
    if (keys.size !== 64 || !complete) ctx.addIssue({ code: "custom", message: "Every region needs seeds 1-16 exactly once." });
    const espnIds = data.slots.flatMap((s) => [s.team.espnId, s.playIn?.espnId].filter(Boolean));
    if (new Set(espnIds).size !== espnIds.length) ctx.addIssue({ code: "custom", message: "A team appears in more than one slot." });
  });

export type PublishInput = z.infer<typeof publishSchema>;
type ImportTeam = z.infer<typeof teamSchema>;

/** A tournament is locked once any bracket has been submitted: only names, logos, colors, and records can change */
export async function isTournamentLocked(tournamentId: string) {
  const submitted = await db.bracket.count({ where: { status: { in: SCORED_STATUSES }, pool: { tournamentId } } });
  return submitted > 0;
}

export async function existingTournamentSummary(year: number) {
  const tournament = await db.tournament.findFirst({
    where: { year },
    include: { _count: { select: { teams: true, games: true, pools: true } } },
  });
  if (!tournament) return null;
  return {
    id: tournament.id,
    name: tournament.name,
    teams: tournament._count.teams,
    games: tournament._count.games,
    pools: tournament._count.pools,
    locked: await isTournamentLocked(tournament.id),
  };
}

/** School names saved on teams (admin edits survive re-imports and later years) */
export async function savedSchoolNames(espnIds: string[]) {
  const teams = await db.team.findMany({ where: { espnId: { in: espnIds }, school: { not: null } }, select: { espnId: true, school: true } });
  return new Map(teams.map((t) => [t.espnId!, t.school!]));
}

// Bracket-order game number within a round: regions in bracket order, games in bracket order
const gameNumber = (regionIndex: number, gamesPerRegion: number, game: number) => regionIndex * gamesPerRegion + game + 1;

export async function publishField(input: PublishInput) {
  const existing = await db.tournament.findFirst({ where: { year: input.year }, include: { teams: true } });
  const locked = existing ? await isTournamentLocked(existing.id) : false;
  const startDate = new Date(input.startDate);
  const endDate = new Date(startDate.getTime() + 18 * 86_400_000);

  return db.$transaction(
    async (tx) => {
      // Teams are shared across tournaments; refresh their details from the import
      const teamIds = new Map<string, string>();
      const upsertTeam = async (team: ImportTeam) => {
        const data = {
          name: team.name,
          shortName: team.abbreviation || team.school.slice(0, 4).toUpperCase(),
          school: team.school,
          logo: team.logo,
          color: team.color,
          alternateColor: team.alternateColor,
        };
        const row = await tx.team.upsert({ where: { espnId: team.espnId }, create: { espnId: team.espnId, ...data }, update: data });
        teamIds.set(team.espnId, row.id);
        return row.id;
      };
      for (const slot of input.slots) {
        await upsertTeam(slot.team);
        if (slot.playIn) await upsertTeam(slot.playIn);
      }

      if (existing && locked) {
        const currentRegions = orderedRegions(existing.regions, [...new Set(existing.teams.map((t) => t.region))]);
        if (currentRegions.join() !== input.regions.join()) {
          throw new PublishError("Brackets have already been submitted, so the regions and Final Four pairing can't change.");
        }
      }

      const tournament = existing
        ? await tx.tournament.update({
            where: { id: existing.id },
            // Dates are schedule facts from ESPN and don't affect brackets, so they refresh even when locked
            data: { name: input.name, regions: input.regions, startDate, endDate },
          })
        : await tx.tournament.create({ data: { name: input.name, year: input.year, regions: input.regions, startDate, endDate } });

      // Slots: update in place so existing games and picks keep pointing at the same rows
      const slotIds = new Map<string, string>();
      for (const slot of input.slots) {
        const key = `${slot.region}-${slot.seed}`;
        const current = existing?.teams.find((t) => t.region === slot.region && t.seed === slot.seed);
        const teamId = teamIds.get(slot.team.espnId)!;
        const playInTeamId = slot.playIn ? teamIds.get(slot.playIn.espnId)! : null;

        if (current && locked) {
          // Only a First Four result may change a locked slot's team
          const allowed = [current.teamId, current.playInTeamId];
          if (!allowed.includes(teamId) || (playInTeamId && !allowed.includes(playInTeamId))) {
            throw new PublishError(`Brackets have already been submitted, so the ${slot.region} ${slot.seed} seed can't change teams.`);
          }
        }

        const data = { teamId, playInTeamId, record: slot.team.record };
        const row = current
          ? await tx.tournamentTeam.update({ where: { id: current.id }, data })
          : await tx.tournamentTeam.create({ data: { ...data, seed: slot.seed, region: slot.region, tournamentId: tournament.id } });
        slotIds.set(key, row.id);
      }

      // Game shells (created once), with Round 1 matchups filled in
      const games = await tx.game.findMany({ where: { tournamentId: tournament.id }, select: { id: true, round: true, gameNumber: true, region: true, status: true } });
      const has = (round: number, number: number) => games.some((g) => g.round === round && g.gameNumber === number);
      let gamesCreated = 0;
      const shells: { round: number; gameNumber: number; region: string | null }[] = [];
      input.regions.forEach((region, ri) => {
        for (const [round, perRegion] of [[2, 4], [3, 2], [4, 1]] as const) {
          for (let g = 0; g < perRegion; g++) shells.push({ round, gameNumber: gameNumber(ri, perRegion, g), region });
        }
      });
      shells.push({ round: 5, gameNumber: 1, region: null }, { round: 5, gameNumber: 2, region: null }, { round: 6, gameNumber: 1, region: null });
      for (const shell of shells) {
        if (has(shell.round, shell.gameNumber)) continue;
        await tx.game.create({ data: { ...shell, tournamentId: tournament.id } });
        gamesCreated++;
      }

      for (const [ri, region] of input.regions.entries()) {
        const regionGames = games.filter((g) => g.round === 1 && g.region === region).sort((a, b) => a.gameNumber - b.gameNumber);
        for (const [g, [high, low]] of R1_SEED_PAIRS.entries()) {
          const data = {
            team1Id: slotIds.get(`${region}-${high}`)!,
            team2Id: slotIds.get(`${region}-${low}`)!,
            espnGameId: input.r1GameIds[`${region}-${high}`] ?? null,
          };
          const game = regionGames[g];
          if (!game) {
            await tx.game.create({ data: { ...data, round: 1, gameNumber: gameNumber(ri, 8, g), region, tournamentId: tournament.id } });
            gamesCreated++;
          } else if (game.status !== "FINAL") {
            await tx.game.update({ where: { id: game.id }, data });
          }
        }
      }

      return { tournamentId: tournament.id, created: !existing, locked, gamesCreated };
    },
    { timeout: 60_000 }
  );
}

export class PublishError extends Error {}
