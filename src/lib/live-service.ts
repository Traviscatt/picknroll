// Builds the shared Game Center payload for a pool: ESPN scores mapped onto the bracket, official and live
// standings, pool splits, and every bracket's total under each result of the day's undecided games.
// The result is the same for every member, so it's memoized briefly per pool and day.
import { db } from "@/lib/db";
import { fetchScoreboard, type EspnLiveEvent } from "@/lib/espn-live";
import { defaultDay, easternDate, isLive, shiftDate, tournamentDays, undecidedOutcomes, type LiveGame, type LivePayload, type Outcome, type StandingEntry } from "@/lib/live";
import {
  bracketGameForSlots,
  maxPossibleScore,
  parsePicksData,
  poolSplit,
  rankEntries,
  scoreBracket,
  withLiveLeaders,
  type Winners,
} from "@/lib/scoring-engine";
import { eliminatedTeams, loadTournamentResults, SCORED_STATUSES } from "@/lib/scoring-service";
import { loadField } from "@/lib/tournament-service";
import type { TournamentField } from "@/lib/tournament-field";

function toLiveGame(event: EspnLiveEvent, field: TournamentField, espnToSlot: Map<string, string>): LiveGame {
  const byId = new Map(field.teams.map((t) => [t.id, t]));
  const teams = event.competitors
    .map((c) => {
      const slot = espnToSlot.get(c.espnId) ?? null;
      const known = slot ? byId.get(slot) : undefined;
      const playIn = known?.playIn?.espnId === c.espnId ? known.playIn : null;
      return {
        slot,
        espnId: c.espnId,
        name: playIn?.name ?? (known && !known.playIn ? known.name : null) ?? c.name,
        seed: known?.seed ?? c.seed,
        logo: playIn?.logo ?? (known && known.espnId === c.espnId ? known.logo : null) ?? c.logo,
        score: c.score,
        winner: c.winner,
      };
    })
    .sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99)) as [LiveGame["teams"][0], LiveGame["teams"][1]];
  const [a, b] = teams;
  return {
    espnId: event.id,
    gameId: event.round > 0 && a.slot && b.slot ? bracketGameForSlots(a.slot, b.slot, field.tournament.regions) : null,
    round: event.round,
    region: event.region,
    state: event.state,
    detail: event.detail,
    startTime: event.date,
    network: event.network,
    teams,
    poolSplit: null,
  };
}

async function buildLivePayload(poolId: string, requestedDate: string | null): Promise<LivePayload> {
  const pool = await db.pool.findUniqueOrThrow({ where: { id: poolId }, select: { tournamentId: true, deadline: true } });
  const field = await loadField(pool.tournamentId);
  if (!field) throw new Error("Tournament not found");

  const espnToSlot = new Map<string, string>();
  for (const t of field.teams) {
    if (t.espnId) espnToSlot.set(t.espnId, t.id);
    if (t.playIn?.espnId) espnToSlot.set(t.playIn.espnId, t.id);
  }

  const now = new Date();
  const today = easternDate(now);
  const days = tournamentDays(field.tournament.startDate);
  const dates = new Set(days.map((d) => d.date));
  const date = requestedDate && dates.has(requestedDate) ? requestedDate : defaultDay(days, today);
  const yesterday = shiftDate(today, -1);
  const ttl = (d: string) => (d === today || d === yesterday ? 10_000 : d > today ? 60_000 : 600_000);
  const liveDates = [today, yesterday].filter((d) => dates.has(d));
  const fetchDates = [...new Set([date, ...liveDates])];
  const eventsByDate = new Map(
    await Promise.all(fetchDates.map(async (d) => [d, (await fetchScoreboard(d, ttl(d))).map((e) => toLiveGame(e, field, espnToSlot))] as const))
  );
  const games = eventsByDate.get(date) ?? [];
  const recent = liveDates.flatMap((d) => eventsByDate.get(d) ?? []);

  const results = await loadTournamentResults(pool.tournamentId);
  const official = results.winners;

  // Live = official + ESPN finals not recorded yet + current leaders of in-progress games
  const finals: Winners = new Map(official);
  for (const g of [...recent, ...games]) {
    const winner = g.teams.find((t) => t.winner)?.slot;
    if (g.gameId && g.state === "post" && winner && !finals.has(g.gameId)) finals.set(g.gameId, winner);
  }
  const live = withLiveLeaders(
    finals,
    [...recent, ...games]
      .filter((g) => g.gameId && isLive(g) && g.teams.every((t) => t.slot && t.score != null))
      .map((g) => ({ gameId: g.gameId!, team1: g.teams[0].slot!, team2: g.teams[1].slot!, team1Score: g.teams[0].score!, team2Score: g.teams[1].score! }))
  );

  const deadlinePassed = now > pool.deadline;
  let standings: StandingEntry[] = [];
  const outcomes: Outcome[] = [];

  if (deadlinePassed) {
    const brackets = await db.bracket.findMany({
      where: { poolId, status: { in: SCORED_STATUSES } },
      select: { id: true, name: true, entryName: true, tiebreaker: true, picksData: true },
    });
    const picks = brackets.map((b) => parsePicksData(b.picksData));
    const eliminated = eliminatedTeams(results);
    const total = (p: (typeof picks)[number], winners: Winners) => {
      const s = scoreBracket(p, winners);
      return s.total + s.bonus;
    };
    const officialScores = picks.map((p) => total(p, official));
    const liveScores = picks.map((p) => total(p, live));
    const rankBy = (scores: number[]) =>
      new Map(rankEntries(brackets.map((b, i) => ({ i, score: scores[i], tiebreaker: b.tiebreaker })), results.actualTiebreaker).map((e) => [e.i, e.rank]));
    const [officialRanks, liveRanks] = [rankBy(officialScores), rankBy(liveScores)];

    standings = brackets.map((b, i) => ({
      bracketId: b.id,
      name: b.entryName,
      bracketName: b.name,
      tiebreaker: b.tiebreaker,
      official: officialScores[i],
      officialRank: officialRanks.get(i)!,
      live: liveScores[i],
      liveRank: liveRanks.get(i)!,
      max: maxPossibleScore(picks[i], official, eliminated),
    }));

    for (const game of games) {
      if (game.gameId) game.poolSplit = poolSplit(picks, game.gameId, game.round, [game.teams[0].slot!, game.teams[1].slot!]);
    }
    outcomes.push(...undecidedOutcomes(picks, live, finals, games));
  }

  const upcoming = [...games, ...recent].filter((g) => g.state === "pre" && new Date(g.startTime) > now).map((g) => g.startTime).sort();
  return {
    generatedAt: now.toISOString(),
    date,
    today,
    days,
    anyLive: [...recent, ...games].some(isLive),
    nextTipoff: upcoming[0] ?? null,
    deadlinePassed,
    actualTiebreaker: results.actualTiebreaker,
    games: games.sort((a, b) => a.startTime.localeCompare(b.startTime)),
    standings,
    outcomes,
  };
}

const memo = new Map<string, { at: number; ttl: number; value: Promise<LivePayload> }>();

/** Shared payload, rebuilt at most every 10 s for live days (longer for other days) per Lambda instance */
export function getLivePayload(poolId: string, date: string | null): Promise<LivePayload> {
  const key = `${poolId}:${date ?? "default"}`;
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.value;
  const value = buildLivePayload(poolId, date);
  const entry = { at: Date.now(), ttl: 10_000, value };
  value.then((p) => {
    if (!p.anyLive && p.date !== p.today) entry.ttl = 60_000;
  }, () => memo.delete(key));
  memo.set(key, entry);
  return value;
}

const members = new Map<string, number>();

/** Whether a user may see a pool's Game Center (member or site admin), cached for 5 minutes */
export async function canViewPool(userId: string, poolId: string, isAdmin: boolean): Promise<boolean> {
  if (isAdmin) return true;
  const key = `${userId}:${poolId}`;
  const cachedAt = members.get(key);
  if (cachedAt && Date.now() - cachedAt < 300_000) return true;
  const member = await db.poolMember.findFirst({ where: { userId, poolId }, select: { id: true } });
  if (member) members.set(key, Date.now());
  return !!member;
}
