// Builds a tournament field (64 slots + First Four) from ESPN scoreboard events. Parsing is pure;
// only fetchEspnFieldEvents touches the network.
import { DEFAULT_REGIONS } from "@/lib/tournament-field";
import { R1_SEED_PAIRS } from "@/lib/bracket-validation";

const ESPN_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball";

export interface EspnFieldTeam {
  espnId: string;
  school: string;
  name: string;
  abbreviation: string;
  logo: string | null;
  color: string | null;
  alternateColor: string | null;
  record: string | null;
}

export interface EspnFieldSlot {
  region: string;
  seed: number;
  team: EspnFieldTeam;
  /** First Four opponent while that game is undecided */
  playIn: EspnFieldTeam | null;
}

export interface EspnField {
  /** Regions in the default bracket order; the admin confirms the Final Four pairing */
  regions: string[];
  slots: EspnFieldSlot[];
  /** ESPN event IDs of Round 1 games, keyed by "<region>-<higher seed>" */
  r1GameIds: Record<string, string>;
  /** Earliest First Four or Round 1 tip-off (ISO) */
  startDate: string | null;
  /** Earliest Round 1 tip-off (ISO), the natural bracket deadline */
  firstRoundTipoff: string | null;
  problems: string[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type EspnEvent = any;

const HEADLINE = /-\s*([A-Za-z ]+?)\s+Region\s*-\s*(1st Round|First Four)/i;

function parseHeadline(event: EspnEvent): { region: string; round: "R1" | "FF" } | null {
  const headline: string = event?.competitions?.[0]?.notes?.[0]?.headline ?? "";
  const match = headline.match(HEADLINE);
  if (!match) return null;
  return { region: match[1].trim(), round: /first four/i.test(match[2]) ? "FF" : "R1" };
}

function schoolName(team: any): string {
  return String(team.location || team.shortDisplayName || team.displayName || "").replace(/\s+University$/, "");
}

function parseCompetitor(c: any): { seed: number | null; team: EspnFieldTeam | null; winner: boolean } {
  const t = c?.team;
  const seed = Number(c?.curatedRank?.current);
  const valid = t?.id && Number(t.id) > 0 && !/TBD|\//.test(String(t.displayName ?? ""));
  return {
    seed: Number.isInteger(seed) && seed >= 1 && seed <= 16 ? seed : null,
    winner: c?.winner === true,
    team: valid
      ? {
          espnId: String(t.id),
          school: schoolName(t),
          name: String(t.displayName ?? schoolName(t)),
          abbreviation: String(t.abbreviation ?? "").toUpperCase(),
          logo: t.logo ?? null,
          color: t.color ?? null,
          alternateColor: t.alternateColor ?? null,
          record: c?.records?.[0]?.summary ?? null,
        }
      : null,
  };
}

export function parseEspnField(events: EspnEvent[]): EspnField {
  const problems: string[] = [];
  const slots = new Map<string, EspnFieldSlot>();
  const firstFour = new Map<string, { teams: EspnFieldTeam[]; winner: EspnFieldTeam | null }>();
  const r1GameIds: Record<string, string> = {};
  const regionsSeen: string[] = [];
  let startDate: string | null = null;
  let firstRoundTipoff: string | null = null;
  const earlier = (a: string | null, b: string) => (a && a < b ? a : b);

  for (const event of events) {
    const info = parseHeadline(event);
    if (!info) continue;
    if (!regionsSeen.includes(info.region)) regionsSeen.push(info.region);
    startDate = earlier(startDate, event.date);
    const competitors = (event.competitions?.[0]?.competitors ?? []).map(parseCompetitor);

    if (info.round === "FF") {
      const seed = competitors.find((c: { seed: number | null }) => c.seed)?.seed;
      const teams = competitors.map((c: { team: EspnFieldTeam | null }) => c.team).filter(Boolean) as EspnFieldTeam[];
      if (!seed || teams.length !== 2) {
        problems.push(`Couldn't read the ${info.region} First Four game (${event.id}).`);
        continue;
      }
      const winner = event.status?.type?.completed ? competitors.find((c: { winner: boolean }) => c.winner)?.team ?? null : null;
      firstFour.set(`${info.region}-${seed}`, { teams, winner });
      continue;
    }

    firstRoundTipoff = earlier(firstRoundTipoff, event.date);
    const seeds = competitors.map((c: { seed: number | null }) => c.seed).filter(Boolean) as number[];
    if (seeds.length === 2) r1GameIds[`${info.region}-${Math.min(...seeds)}`] = String(event.id);
    for (const c of competitors) {
      if (!c.seed || !c.team) continue;
      const key = `${info.region}-${c.seed}`;
      if (slots.has(key)) problems.push(`${info.region} has two ${c.seed} seeds.`);
      slots.set(key, { region: info.region, seed: c.seed, team: c.team, playIn: null });
    }
  }

  // First Four: the slot holds the winner once known, otherwise both teams
  for (const [key, game] of firstFour) {
    const [region, seed] = [key.slice(0, key.lastIndexOf("-")), Number(key.slice(key.lastIndexOf("-") + 1))];
    if (game.winner) {
      slots.set(key, { region, seed, team: game.winner, playIn: null });
    } else {
      const existing = slots.get(key)?.team;
      const team = game.teams.find((t) => t.espnId === existing?.espnId) ?? game.teams[0];
      slots.set(key, { region, seed, team, playIn: game.teams.find((t) => t !== team) ?? null });
    }
  }

  const regions = DEFAULT_REGIONS.every((r) => regionsSeen.includes(r)) && regionsSeen.length === 4 ? [...DEFAULT_REGIONS] : regionsSeen;
  if (regions.length !== 4) problems.push(`Expected 4 regions, found ${regions.length}${regions.length ? ` (${regions.join(", ")})` : ""}.`);
  for (const region of regions) {
    const missing = Array.from({ length: 16 }, (_, i) => i + 1).filter((seed) => !slots.has(`${region}-${seed}`));
    if (missing.length) problems.push(`${region} is missing seed${missing.length > 1 ? "s" : ""} ${missing.join(", ")}.`);
    for (const [high] of R1_SEED_PAIRS) {
      if (slots.has(`${region}-${high}`) && !r1GameIds[`${region}-${high}`]) {
        problems.push(`No Round 1 game found for the ${region} ${high} seed.`);
      }
    }
  }
  if (firstFour.size > 4) problems.push(`Found ${firstFour.size} First Four games (expected up to 4).`);

  return {
    regions,
    slots: [...slots.values()].sort((a, b) => regions.indexOf(a.region) - regions.indexOf(b.region) || a.seed - b.seed),
    r1GameIds,
    startDate,
    firstRoundTipoff,
    problems,
  };
}

const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

/** First Four and Round 1 events from the days after Selection Sunday (YYYY-MM-DD) */
export async function fetchEspnFieldEvents(selectionSunday: string): Promise<EspnEvent[]> {
  const start = new Date(`${selectionSunday}T12:00:00Z`);
  if (Number.isNaN(start.getTime())) throw new Error("Invalid Selection Sunday date");
  // Mon-Sat after Selection Sunday covers the First Four (Tue/Wed) and Round 1 (Thu/Fri).
  // Date ranges don't work with the tournament group filter, so fetch day by day.
  const days = Array.from({ length: 6 }, (_, i) => ymd(new Date(start.getTime() + (i + 1) * 86_400_000)));
  const responses = await Promise.all(
    days.map(async (day) => {
      const res = await fetch(`${ESPN_BASE_URL}/scoreboard?dates=${day}&limit=100&groups=100`, { cache: "no-store" });
      if (!res.ok) throw new Error(`ESPN request failed for ${day} (${res.status})`);
      return (await res.json()).events ?? [];
    }),
  );
  return responses.flat();
}
