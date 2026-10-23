"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useLiveData } from "@/hooks/use-live-data";
import { useStandingsMode } from "@/hooks/use-standings-mode";
import { useTournamentField } from "@/hooks/use-tournament-field";
import { isLive, pickVerdict, rootingFor, tonightRange, type LiveGame, type Rooting } from "@/lib/live";
import { parsePicksData } from "@/lib/scoring-engine";
import { getTeamBySlug } from "@/lib/team-colors";
import { GameCard } from "@/components/game-center/game-card";
import { RootingGuide } from "@/components/game-center/rooting-guide";
import { StandingsPanel } from "@/components/game-center/standings-panel";
import { YourNight } from "@/components/game-center/your-night";

interface MyBracket {
  id: string;
  name: string;
  entryName: string;
  status: string;
  poolId: string | null;
  picksData: string | null;
}

function UpdatedAgo({ at }: { at: number | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(timer);
  }, []);
  if (!at) return null;
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <RefreshCw className="h-3 w-3" />
      Updated {seconds < 60 ? `${seconds}s` : `${Math.round(seconds / 60)}m`} ago
    </span>
  );
}

export default function GameCenterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [poolId, setPoolId] = useState<string | null>(null);
  const [myBrackets, setMyBrackets] = useState<MyBracket[]>([]);
  const [setupDone, setSetupDone] = useState(false);
  const [date, setDate] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"games" | "rooting">("games");
  const [mode, setMode] = useStandingsMode();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!session) return;
    Promise.all([fetch("/api/pools").then((r) => (r.ok ? r.json() : [])), fetch("/api/brackets").then((r) => (r.ok ? r.json() : []))])
      .then(([pools, brackets]: [{ id: string }[], MyBracket[]]) => {
        const pool = pools[0]?.id ?? null;
        setPoolId(pool);
        setMyBrackets(brackets.filter((b) => b.poolId === pool && b.status !== "DRAFT"));
      })
      .catch(() => undefined)
      .finally(() => setSetupDone(true));
  }, [session]);

  const { data, error, updatedAt, loading } = useLiveData(poolId, date);
  const { lookup } = useTournamentField(poolId, !!poolId);

  const favoriteTeam = session?.user?.favoriteTeam;
  const favoriteEspnId = (favoriteTeam ? getTeamBySlug(favoriteTeam)?.logo : null)?.match(/\/(\d+)\.png/)?.[1] ?? null;

  const myIds = useMemo(() => myBrackets.map((b) => b.id), [myBrackets]);
  const standings = useMemo(() => data?.standings ?? [], [data]);
  const selected = selectedId ?? myBrackets.find((b) => standings.some((s) => s.bracketId === b.id))?.id ?? myBrackets[0]?.id ?? null;
  const index = standings.findIndex((s) => s.bracketId === selected);
  const entry = index >= 0 ? standings[index] : null;
  const picksByGame = useMemo(() => {
    const bracket = myBrackets.find((b) => b.id === selected);
    return new Map(parsePicksData(bracket?.picksData ?? null).map((p) => [p.gameId, p.choices]));
  }, [myBrackets, selected]);

  const rootings = useMemo(() => {
    const map = new Map<string, Rooting>();
    if (data && index >= 0) for (const o of data.outcomes) map.set(o.gameId, rootingFor(o, index, data.standings, data.actualTiebreaker));
    return map;
  }, [data, index]);
  const range = useMemo(() => (data && index >= 0 ? tonightRange(data, index) : null), [data, index]);

  if (status === "loading" || !setupDone || (poolId && loading)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }
  if (!session) return null;
  if (!poolId || !data) {
    return (
      <Card className="mx-auto mt-12 max-w-lg">
        <CardHeader>
          <CardTitle>Game Center</CardTitle>
          <CardDescription>{!poolId ? "Join a pool to follow games and your picks here." : error ?? "Live scores are unavailable right now."}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const games = data.games;
  const groups: [string, LiveGame[], boolean][] = [
    ["Live now", games.filter(isLive), true],
    ["Final", games.filter((g) => g.state === "post"), false],
    ["Up next", games.filter((g) => g.state === "pre"), false],
  ];
  const day = data.days.find((d) => d.date === data.date);
  const currentRank = entry ? entry.liveRank : null;
  const items = games.flatMap((game) => {
    const rooting = game.gameId ? rootings.get(game.gameId) : undefined;
    return rooting ? [{ game, rooting, choices: picksByGame.get(game.gameId!) ?? null }] : [];
  });
  const biggestSwing = Math.max(0, ...items.map((i) => i.rooting.swing));
  const highlightGame = items.filter((i) => isLive(i.game) && i.rooting.swing > 0).sort((a, b) => b.rooting.swing - a.rooting.swing)[0]?.game.espnId;
  const withPicks = games.filter((g) => g.gameId && picksByGame.has(g.gameId));
  const alive = {
    total: withPicks.length,
    alive: withPicks.filter((g) => pickVerdict(picksByGame.get(g.gameId!)!, g)?.tone !== "zero").length,
  };
  const selectedBracket = myBrackets.find((b) => b.id === selected);
  const counts = groups.map(([label, list]) => `${list.length} ${label === "Live now" ? "live" : label === "Final" ? "final" : "upcoming"}`).join(", ");

  const yourNight = entry && data.deadlinePassed && (
    <YourNight
      entry={entry}
      title={selectedBracket?.name ?? entry.bracketName}
      anyLive={data.anyLive}
      alive={alive}
      biggestSwing={biggestSwing}
      onRooting={() => setView("rooting")}
      onLiveStandings={() => data.anyLive && setMode("live")}
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Game Center</h1>
          <p className="text-sm text-muted-foreground">
            {day ? `${day.round} · ${day.label}` : ""}
            {games.length ? ` · ${counts}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <UpdatedAgo at={updatedAt} />
          {myBrackets.length > 1 && (
            <Select value={selected ?? undefined} onValueChange={setSelectedId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Bracket" />
              </SelectTrigger>
              <SelectContent>
                {myBrackets.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                    {b.entryName && b.entryName !== b.name ? ` (${b.entryName})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {data.days.map((d) => {
          const active = d.date === data.date;
          return (
            <button
              key={d.date}
              type="button"
              onClick={() => setDate(d.date)}
              className={cn(
                "flex shrink-0 flex-col items-center rounded-lg border px-3 py-1.5 text-sm",
                active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
                d.date === data.today && !active && "border-primary"
              )}
            >
              <span className="font-semibold">{d.label}</span>
              <span className={cn("text-[10px]", active ? "opacity-80" : "text-muted-foreground")}>{d.round}</span>
            </button>
          );
        })}
      </div>

      {error && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error} Showing the last update.</p>}

      {!data.deadlinePassed && (
        <p className="rounded-lg border bg-secondary px-3 py-2 text-sm">
          Standings, pool picks, and the rooting guide appear once brackets lock at the first Round 1 tip-off.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-4">
          <div className="lg:hidden">{yourNight}</div>

          {data.deadlinePassed && entry && (
            <div className="flex w-full max-w-xs gap-1 rounded-lg bg-muted p-1">
              {(["games", "rooting"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={cn("flex-1 rounded-md px-3 py-1.5 text-sm font-medium", view === v ? "bg-background shadow" : "text-muted-foreground")}
                >
                  {v === "games" ? "Games" : "Rooting guide"}
                </button>
              ))}
            </div>
          )}

          {view === "rooting" && entry ? (
            <RootingGuide items={items} currentRank={currentRank} range={range} />
          ) : (
            <>
              {games.length === 0 && (
                <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">No games found for this day yet.</p>
              )}
              {groups.map(([label, list, live]) =>
                list.length ? (
                  <section key={label} className="space-y-3">
                    <h2 className="flex items-center gap-2 font-semibold">
                      {live && <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />}
                      {label}
                      <span className="text-xs font-normal text-muted-foreground">
                        {list.length} game{list.length === 1 ? "" : "s"}
                      </span>
                    </h2>
                    <div className="grid gap-4 xl:grid-cols-2">
                      {list.map((game) => (
                        <GameCard
                          key={game.espnId}
                          game={game}
                          choices={game.gameId ? picksByGame.get(game.gameId) ?? null : null}
                          lookup={lookup}
                          rooting={game.gameId ? rootings.get(game.gameId) ?? null : null}
                          currentRank={currentRank}
                          favoriteEspnId={favoriteEspnId}
                          highlight={game.espnId === highlightGame}
                        />
                      ))}
                    </div>
                  </section>
                ) : null
              )}
            </>
          )}
        </div>

        <aside className="hidden space-y-4 lg:block">
          {yourNight}
          {data.deadlinePassed && standings.length > 0 && (
            <StandingsPanel standings={standings} mode={mode} onModeChange={setMode} anyLive={data.anyLive} myBracketIds={myIds} />
          )}
          {entry && items.length > 0 && (
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="flex items-center justify-between px-4 py-3">
                <h3 className="font-semibold">Root for</h3>
                <span className="text-[11px] text-muted-foreground">biggest swing first</span>
              </div>
              <RootingGuide items={items} currentRank={currentRank} range={null} compact />
              <button type="button" onClick={() => setView("rooting")} className="w-full border-t px-4 py-2.5 text-right text-xs font-semibold text-primary">
                Open rooting guide →
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
