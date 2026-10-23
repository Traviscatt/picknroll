// The tournament field (teams in bracket slots), shared by server and client. No database access.
// Team IDs are bracket slot keys "<region>-<seed>" (e.g. "east-1"), the same IDs stored in Bracket.picksData.

export const DEFAULT_REGIONS = ["East", "South", "West", "Midwest"];

export interface FieldTeam {
  /** Bracket slot key, e.g. "east-1" */
  id: string;
  seed: number;
  region: string;
  /** Name shown in brackets; "A / B" while a First Four game is undecided */
  name: string;
  fullName: string;
  abbreviation: string;
  logo: string | null;
  record: string | null;
  espnId: string | null;
  color: string | null;
  /** First Four opponent while the play-in game is undecided */
  playIn: { name: string; logo: string | null; espnId: string | null } | null;
}

export interface FieldTournament {
  id: string;
  name: string;
  year: number;
  /** Bracket order: the Final Four pairs regions[0] vs [1] and [2] vs [3] */
  regions: string[];
  startDate: string;
}

export interface TournamentField {
  tournament: FieldTournament;
  teams: FieldTeam[];
}

export const slotKey = (region: string, seed: number) => `${region.toLowerCase()}-${seed}`;

/** Regions in bracket order, falling back to the standard order for tournaments created before `regions` existed */
export function orderedRegions(stored: string[], present: string[]): string[] {
  if (stored.length === 4) return stored;
  const known = DEFAULT_REGIONS.filter((r) => present.includes(r));
  return [...known, ...present.filter((r) => !known.includes(r)).sort()];
}

/** The two Final Four semifinals as region pairs */
export function finalFourPairs(regions: string[]): [string, string][] {
  return [
    [regions[0], regions[1]],
    [regions[2], regions[3]],
  ];
}

interface SlotTeam {
  name: string;
  shortName: string;
  school: string | null;
  espnId: string | null;
  logo: string | null;
  color: string | null;
}

export const displayName = (team: Pick<SlotTeam, "school" | "name">) => team.school || team.name;

/** Builds one field entry from a tournament slot and its team(s) */
export function toFieldTeam(slot: {
  seed: number;
  region: string;
  record: string | null;
  team: SlotTeam;
  playInTeam: SlotTeam | null;
}): FieldTeam {
  const { team, playInTeam } = slot;
  return {
    id: slotKey(slot.region, slot.seed),
    seed: slot.seed,
    region: slot.region,
    name: playInTeam ? `${displayName(team)} / ${displayName(playInTeam)}` : displayName(team),
    fullName: team.name,
    abbreviation: team.shortName,
    logo: team.logo,
    record: slot.record,
    espnId: team.espnId,
    color: team.color,
    playIn: playInTeam ? { name: displayName(playInTeam), logo: playInTeam.logo, espnId: playInTeam.espnId } : null,
  };
}

/** Fast lookups over a field for rendering brackets */
export function createFieldLookup(field: TournamentField | null) {
  const byId = new Map((field?.teams ?? []).map((t) => [t.id, t]));
  return {
    regions: field?.tournament.regions ?? [],
    get: (teamId: string) => byId.get(teamId),
    name: (teamId: string) => byId.get(teamId)?.name ?? teamId,
    logo: (teamId: string) => byId.get(teamId)?.logo ?? null,
    region: (region: string) =>
      (field?.teams ?? []).filter((t) => t.region === region).sort((a, b) => a.seed - b.seed),
  };
}

export type FieldLookup = ReturnType<typeof createFieldLookup>;
