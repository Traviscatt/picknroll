// ESPN tournament scoreboard for one day, with a short in-memory cache so polling viewers share requests.
import type { GameState } from "@/lib/live";

const ESPN_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball";

export interface EspnLiveEvent {
  id: string;
  date: string;
  region: string | null;
  /** 0 = First Four, 1-6 = bracket rounds */
  round: number;
  state: GameState;
  detail: string;
  network: string | null;
  competitors: { espnId: string; name: string; logo: string | null; seed: number | null; score: number | null; winner: boolean }[];
}

const ROUNDS: [RegExp, number][] = [
  [/first four/i, 0],
  [/1st round/i, 1],
  [/2nd round/i, 2],
  [/sweet 16/i, 3],
  [/elite 8|elite eight/i, 4],
  [/final four/i, 5],
  [/national championship/i, 6],
];

/* eslint-disable @typescript-eslint/no-explicit-any */
export function parseScoreboardEvent(event: any): EspnLiveEvent | null {
  const competition = event?.competitions?.[0];
  const headline: string = competition?.notes?.[0]?.headline ?? "";
  const round = ROUNDS.find(([pattern]) => pattern.test(headline))?.[1];
  if (round === undefined || competition?.competitors?.length !== 2) return null;

  const type = event.status?.type ?? {};
  const state: GameState =
    type.state === "post" ? "post" : type.name === "STATUS_HALFTIME" ? "half" : type.state === "in" ? "in" : "pre";
  return {
    id: String(event.id),
    date: event.date,
    region: headline.match(/-\s*([A-Za-z ]+?)\s+Region/)?.[1]?.trim() ?? null,
    round,
    state,
    detail: type.shortDetail ?? type.detail ?? "",
    network: competition.broadcasts?.[0]?.names?.[0] ?? null,
    competitors: competition.competitors.map((c: any) => {
      const seed = Number(c.curatedRank?.current);
      return {
        espnId: String(c.team?.id ?? ""),
        name: String(c.team?.location ?? c.team?.shortDisplayName ?? c.team?.displayName ?? "TBD"),
        logo: c.team?.logo ?? null,
        seed: Number.isInteger(seed) && seed >= 1 && seed <= 16 ? seed : null,
        score: state === "pre" ? null : Number.parseInt(c.score, 10) || 0,
        winner: c.winner === true,
      };
    }),
  };
}

const cache = new Map<string, { at: number; ttl: number; value: Promise<EspnLiveEvent[]> }>();

/** Tournament games on one day (YYYYMMDD, US Eastern), cached for `ttlMs` */
export function fetchScoreboard(date: string, ttlMs: number): Promise<EspnLiveEvent[]> {
  const hit = cache.get(date);
  if (hit && Date.now() - hit.at < Math.min(hit.ttl, ttlMs)) return hit.value;
  const value = fetch(`${ESPN_BASE_URL}/scoreboard?dates=${date}&limit=100&groups=100`, { cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error(`ESPN scoreboard ${date}: ${res.status}`);
      return res.json();
    })
    .then((data) => (data.events ?? []).map(parseScoreboardEvent).filter((e: EspnLiveEvent | null): e is EspnLiveEvent => e !== null));
  value.catch(() => cache.delete(date));
  cache.set(date, { at: Date.now(), ttl: ttlMs, value });
  return value;
}
