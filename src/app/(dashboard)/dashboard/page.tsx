"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { ChevronRight, Copy, Pin, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { Panel } from "@/components/shared/panel";
import { ScoringRules } from "@/components/shared/scoring-rules";
import { StickyBar } from "@/components/shared/sticky-bar";
import { EntrySwitcher } from "@/components/bracket/entry-switcher";
import { EntryChecklist } from "@/components/home/entry-checklist";
import { EntryStandings } from "@/components/home/entry-standings";
import { TodayGames } from "@/components/home/today-games";
import { PodiumPanel } from "@/components/home/season-recap";
import { CompleteHero, EntryHero, FollowAlongHero, JoinHero, PreseasonHero, readyCount, useNow } from "@/components/home/phase-heroes";
import { YourNight } from "@/components/game-center/your-night";
import { StandingsPanel } from "@/components/game-center/standings-panel";
import { RootingGuide } from "@/components/game-center/rooting-guide";
import { ordinal, UpdatedAgo } from "@/components/game-center/parts";
import { useTournamentField } from "@/hooks/use-tournament-field";
import { useLiveData } from "@/hooks/use-live-data";
import { useStandingsMode } from "@/hooks/use-standings-mode";
import { cn } from "@/lib/utils";
import { paymentDetails } from "@/lib/payment";
import { isLive, personalSummary } from "@/lib/live";
import { parsePicksData } from "@/lib/scoring-engine";
import { formatDeadline, seasonLabel, timeLeft, type SeasonPool, type SeasonResponse } from "@/lib/season";
import type { HallOfFameSeason } from "@/lib/hall-of-fame";
import type { FieldLookup } from "@/lib/tournament-field";

interface Announcement {
  id: string;
  title: string;
  message: string;
  pinned: boolean;
  createdAt: string;
  author: { name: string };
}

interface PickStats {
  championshipPicks: { teamId: string; count: number; percentage: number }[];
  totalBrackets: number;
}

interface MyBracket {
  id: string;
  name: string;
  status: string;
  picksData: string | null;
}

interface LeaderboardRow {
  rank: number;
  bracketId: string;
  name: string;
  bracketName: string;
  score: number;
  isCurrentUser: boolean;
}

const json = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [season, setSeason] = useState<SeasonResponse | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [pickStats, setPickStats] = useState<PickStats | null>(null);
  const [myBrackets, setMyBrackets] = useState<MyBracket[]>([]);
  const [hallOfFame, setHallOfFame] = useState<HallOfFameSeason[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [heroEl, setHeroEl] = useState<HTMLDivElement | null>(null);
  const [mode, setMode] = useStandingsMode();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!session) return;
    Promise.all([json("/api/season"), json("/api/announcements")]).then(([s, a]) => {
      setSeason(s ?? { phase: "no-pool", pool: null, tournament: null, entries: [] });
      setAnnouncements(a ?? []);
    });
  }, [session]);

  // Extra data only where the phase needs it
  const phase = season?.phase;
  const poolId = season?.pool?.id ?? null;
  useEffect(() => {
    if (!poolId || !phase) return;
    if (phase === "tournament" || phase === "complete") json(`/api/pool/pick-stats?poolId=${poolId}`).then(setPickStats);
    if (phase === "tournament") json(`/api/brackets?poolId=${poolId}`).then((b) => setMyBrackets((b ?? []).filter((x: MyBracket) => x.status !== "DRAFT")));
    if (phase === "complete" || phase === "preseason") json("/api/hall-of-fame").then((h: { seasons: HallOfFameSeason[] } | null) => setHallOfFame(h?.seasons ?? []));
    if (phase === "complete") json("/api/leaderboard").then((l) => setLeaderboard(l?.entries ?? []));
  }, [phase, poolId]);

  const live = useLiveData(poolId, null, phase === "tournament");
  const { lookup } = useTournamentField(poolId, !!poolId && (phase === "tournament" || phase === "complete"));
  const myIds = useMemo(() => myBrackets.map((b) => b.id), [myBrackets]);
  const inStandings = useMemo(() => myBrackets.filter((b) => live.data?.standings.some((s) => s.bracketId === b.id)), [myBrackets, live.data]);
  const selected = inStandings.find((b) => b.id === selectedId) ?? inStandings[0] ?? null;
  const picksByGame = useMemo(() => new Map(parsePicksData(selected?.picksData ?? null).map((p) => [p.gameId, p.choices])), [selected?.picksData]);
  const summary = useMemo(() => (live.data ? personalSummary(live.data, selected?.id ?? null, picksByGame) : null), [live.data, selected?.id, picksByGame]);

  if (status === "loading" || !season) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
    );
  }
  if (!session) return null;

  const { pool, entries, tournament } = season;
  const firstName = session.user?.name?.split(" ")[0];
  const label = pool ? seasonLabel(tournament?.year, pool.name) : null;
  const day = live.data?.days.find((d) => d.date === live.data?.date);
  const liveCount = live.data?.games.filter(isLive).length ?? 0;
  const lastSeason = hallOfFame.find((s) => s.year === tournament?.year) ?? (phase === "preseason" ? hallOfFame[0] : undefined);
  const champion = lastSeason?.podium.find((p) => p.place === 1) ?? null;
  const scored = entries.filter((e) => e.summary && e.rank);
  const best = [...scored].sort((a, b) => a.rank! - b.rank!)[0] ?? null;
  const entry = summary?.entry ?? null;
  const showPicks = pickStats && pickStats.championshipPicks.length > 0 && <ChampionshipPicks stats={pickStats} lookup={lookup} />;
  const showAnnouncements = announcements.length > 0 && <Announcements items={announcements} />;
  const rules = <ScoringRules deadline={pool?.deadline ?? null} />;
  const poolPanel = pool && <PoolPanel pool={pool} />;

  const meta = (() => {
    switch (season.phase) {
      case "no-pool":
        return "Join a pool to get started";
      case "preseason":
        return `${label} · Brackets open after Selection Sunday`;
      case "entry":
        return `${label} · Picks lock ${formatDeadline(pool!.deadline)}`;
      case "tournament":
        return (
          <span className="inline-flex flex-wrap items-center gap-x-1.5">
            {live.data?.anyLive && <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />}
            {[label, day?.round, day?.label, liveCount ? `${liveCount} live` : null].filter(Boolean).join(" · ")}
          </span>
        );
      case "complete":
        return `${label} · Final`;
    }
  })();

  // Hero, its phone sticky summary, the main column, and the rail for each phase
  const layout = (() => {
    switch (season.phase) {
      case "no-pool":
        return { hero: <JoinHero />, sticky: null, main: <HowItWorks />, rail: rules };
      case "preseason":
        return {
          hero: <PreseasonHero year={tournament?.year ?? null} pool={pool!} champion={champion} championYear={lastSeason?.year ?? null} />,
          sticky: null,
          main: (
            <>
              {lastSeason ? <PodiumPanel season={lastSeason} title={`${lastSeason.year} podium`} /> : <WhatsNext />}
              {showAnnouncements}
            </>
          ),
          rail: (
            <>
              {poolPanel}
              {rules}
            </>
          ),
        };
      case "entry":
        return {
          hero: <EntryHero pool={pool!} entries={entries} />,
          sticky: <EntrySticky pool={pool!} ready={readyCount(entries)} total={entries.length} />,
          main: (
            <>
              <EntryChecklist pool={pool!} entries={entries} />
              {showAnnouncements}
            </>
          ),
          rail: (
            <>
              {poolPanel}
              {rules}
            </>
          ),
        };
      case "tournament":
        return {
          hero:
            entry && summary ? (
              <YourNight
                entry={entry}
                title={selected?.name ?? entry.bracketName}
                anyLive={!!live.data?.anyLive}
                alive={summary.alive}
                biggestSwing={summary.biggestSwing}
                onRooting={() => router.push("/game-center?view=rooting")}
                onLiveStandings={() => live.data?.anyLive && setMode("live")}
              />
            ) : live.loading ? (
              <Skeleton className="h-52 w-full rounded-2xl" />
            ) : (
              <FollowAlongHero round={day?.round ?? null} />
            ),
          sticky: entry && (
            <div className="flex items-center gap-2 text-sm">
              {live.data?.anyLive && <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-600" />}
              <span className="font-bold">{ordinal(live.data?.anyLive ? entry.liveRank : entry.officialRank)}</span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{selected?.name ?? entry.bracketName}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                <span className="font-bold text-primary">{live.data?.anyLive ? entry.live : entry.official}</span> pts
                {summary?.alive.total ? ` · ${summary.alive.alive}/${summary.alive.total} alive` : ""}
              </span>
            </div>
          ),
          switcher: inStandings.length > 1 && selected && <EntrySwitcher entries={inStandings} currentId={selected.id} onGo={setSelectedId} />,
          main: (
            <>
              {live.data ? (
                <TodayGames data={live.data} picksByGame={picksByGame} />
              ) : live.loading ? (
                <Skeleton className="h-64 w-full rounded-xl" />
              ) : (
                <Panel title="Games" footer={{ label: "Open Game Center", href: "/game-center" }}>
                  <p className="border-t px-4 py-6 text-center text-sm text-muted-foreground">Live scores are unavailable right now.</p>
                </Panel>
              )}
              {showPicks}
              {showAnnouncements}
            </>
          ),
          rail: (
            <>
              {live.data && live.data.standings.length > 0 && (
                <StandingsPanel standings={live.data.standings} mode={mode} onModeChange={setMode} anyLive={live.data.anyLive} myBracketIds={myIds} />
              )}
              {entry && summary && summary.items.length > 0 && (
                <Panel
                  title="Root for"
                  aside={<span className="text-[11px] text-muted-foreground">biggest swing first</span>}
                  footer={{ label: "Open rooting guide", href: "/game-center?view=rooting" }}
                >
                  <RootingGuide items={summary.items} currentRank={entry.liveRank} range={null} compact />
                </Panel>
              )}
              <EntryStandings entries={entries} lookup={lookup} poolEntries={pool!.entries} />
              {poolPanel}
              {rules}
            </>
          ),
        };
      case "complete":
        return {
          hero: <CompleteHero year={tournament?.year ?? null} best={best} poolEntries={pool!.entries} champion={champion} lookup={lookup} />,
          sticky: best && (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold">{ordinal(best.rank!)}</span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                of {pool!.entries} · {best.name}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                <span className="font-bold text-primary">{best.summary!.score}</span> pts
              </span>
            </div>
          ),
          main: (
            <>
              {leaderboard.length > 0 && <FinalStandings rows={leaderboard} />}
              {showPicks}
              {showAnnouncements}
            </>
          ),
          rail: (
            <>
              {lastSeason && <PodiumPanel season={lastSeason} title="Podium" />}
              {poolPanel}
              {rules}
            </>
          ),
        };
    }
  })();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hi, ${firstName ?? "there"}`}
        description={meta}
        actions={
          season.phase === "tournament" ? (
            // Phones use the tab bar's Live tab and the entry switcher instead
            <div className="hidden items-center gap-2 sm:flex">
              <UpdatedAgo at={live.updatedAt} />
              {inStandings.length > 1 && selected && (
                <Select value={selected.id} onValueChange={setSelectedId}>
                  <SelectTrigger className="hidden w-48 lg:flex">
                    <SelectValue placeholder="Bracket" />
                  </SelectTrigger>
                  <SelectContent>
                    {inStandings.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button asChild variant="outline">
                <Link href="/game-center">
                  <Radio className="mr-1.5 h-4 w-4" /> Game Center
                </Link>
              </Button>
            </div>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-4">
          <div className="space-y-2 lg:hidden" ref={setHeroEl}>
            {layout.hero}
            {"switcher" in layout && layout.switcher}
          </div>
          {layout.sticky && <StickyBar target={heroEl}>{layout.sticky}</StickyBar>}
          {layout.main}
        </div>
        <aside className="min-w-0 space-y-4">
          <div className="hidden lg:block">{layout.hero}</div>
          {layout.rail}
        </aside>
      </div>
    </div>
  );
}

function EntrySticky({ pool, ready, total }: { pool: SeasonPool; ready: number; total: number }) {
  const now = useNow();
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Picks lock in</span>
      <span className="min-w-0 flex-1 truncate font-bold">{timeLeft(pool.deadline, now) ?? "a moment"}</span>
      {total > 0 && (
        <span className="shrink-0 tabular-nums text-muted-foreground">
          <span className="font-bold text-primary">{ready}</span>/{total} ready
        </span>
      )}
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { href: "/join", title: "Join a pool", detail: "Enter the invite code from your pool admin" },
    { href: "/brackets/new", title: "Fill out a bracket", detail: "Pick every game, ranking more teams in later rounds" },
    { href: "/payment", title: "Pay the entry fee", detail: "Venmo or PayPal, set by your pool" },
  ];
  return (
    <Panel title="How it works" count="3 steps">
      <div className="divide-y border-t">
        {steps.map((s, i) => (
          <Link key={s.href} href={s.href} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{s.title}</span>
              <span className="block text-xs text-muted-foreground">{s.detail}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </Panel>
  );
}

function WhatsNext() {
  return (
    <Panel title="What happens next">
      <div className="divide-y border-t text-sm">
        {[
          ["Selection Sunday", "The field is announced and imported into the app."],
          ["Brackets open", "Fill out as many entries as you like before the first tip-off."],
          ["Game Center", "Follow every game live with your picks and the pool's."],
        ].map(([title, detail]) => (
          <div key={title} className="px-4 py-3">
            <p className="font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground">{detail}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Announcements({ items }: { items: Announcement[] }) {
  return (
    <Panel title="Announcements" count={items.length > 3 ? `${items.length}` : undefined}>
      <div className="divide-y border-t">
        {items.slice(0, 3).map((a) => (
          <div key={a.id} className={cn("px-4 py-3", a.pinned && "bg-secondary/60")}>
            <h4 className="flex items-center gap-1.5 text-sm font-semibold">
              {a.title}
              {a.pinned && <Pin className="h-3 w-3 text-primary" />}
            </h4>
            <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{a.message}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {a.author.name} · {new Date(a.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function FinalStandings({ rows, limit = 5 }: { rows: LeaderboardRow[]; limit?: number }) {
  const top = rows.slice(0, limit);
  const mine = rows.filter((r, i) => i >= limit && r.isCurrentUser);
  const row = (r: LeaderboardRow) => (
    <div key={r.bracketId} className={cn("flex items-center gap-2.5 px-4 py-2", r.isCurrentUser && "bg-secondary")}>
      <span className="w-5 text-right text-sm font-semibold text-muted-foreground">{r.rank}</span>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-sm", r.isCurrentUser ? "font-bold" : "font-medium")}>{r.name}</span>
        {r.bracketName !== r.name && <span className="block truncate text-[11px] text-muted-foreground">{r.bracketName}</span>}
      </span>
      {r.isCurrentUser && <span className="rounded border border-primary px-1.5 text-[10px] font-semibold text-primary">You</span>}
      <span className="w-9 text-right font-bold tabular-nums text-primary">{r.score}</span>
    </div>
  );
  return (
    <Panel title="Final standings" count={`${rows.length} entries`} footer={{ label: "Full standings", href: "/leaderboard" }}>
      {top.map(row)}
      {mine.length > 0 && <div className="px-4 text-center text-xs text-muted-foreground">⋯</div>}
      {mine.map(row)}
    </Panel>
  );
}

function ChampionshipPicks({ stats, lookup }: { stats: PickStats; lookup: FieldLookup }) {
  const max = stats.championshipPicks[0].percentage;
  return (
    <Panel title="Who the pool picked to win it all" count={`${stats.totalBrackets} brackets`}>
      <div className="space-y-2.5 px-4 pb-4">
        {stats.championshipPicks.slice(0, 8).map((pick) => {
          const info = lookup.get(pick.teamId);
          const logo = lookup.logo(pick.teamId);
          return (
            <div key={pick.teamId} className="flex items-center gap-3">
              {logo ? <Image src={logo} alt="" width={22} height={22} className="h-[22px] w-[22px] shrink-0 object-contain" unoptimized /> : <span className="h-[22px] w-[22px] shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-medium">
                    {info ? <span className="mr-1 text-xs text-muted-foreground">{info.seed}</span> : null}
                    {lookup.name(pick.teamId)}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">{pick.percentage}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted">
                  <div className="h-1.5 rounded-full bg-primary" style={{ width: `${max ? (pick.percentage / max) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function PoolPanel({ pool }: { pool: SeasonPool }) {
  const copy = () => {
    navigator.clipboard.writeText(pool.inviteCode);
    toast.success("Invite code copied");
  };
  return (
    <Panel title={pool.name}>
      <div className="grid grid-cols-3 gap-2 px-4 pb-3 text-center">
        {[
          [pool.members, "members"],
          [pool.entries, "entries"],
          [paymentDetails(pool).feeLabel, "per entry"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-lg bg-muted/60 py-2">
            <p className="text-lg font-bold tabular-nums">{value}</p>
            <p className="text-[11px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2 border-t px-4 py-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Invite code</span>
          <button type="button" onClick={copy} className="flex items-center gap-1.5 font-mono font-semibold" aria-label="Copy invite code">
            {pool.inviteCode} <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Deadline</span>
          <span className="text-right font-medium">{formatDeadline(pool.deadline)}</span>
        </div>
      </div>
    </Panel>
  );
}
