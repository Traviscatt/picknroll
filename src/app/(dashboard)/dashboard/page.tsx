"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { ChevronRight, Copy, Crown, Megaphone, Pin, Plus, Radio, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { ScoringRules } from "@/components/shared/scoring-rules";
import { DeadlineCountdown, EntryChecklist } from "@/components/home/entry-checklist";
import { TodayGames } from "@/components/home/today-games";
import { SeasonRecap } from "@/components/home/season-recap";
import { YourNight } from "@/components/game-center/your-night";
import { StandingsPanel } from "@/components/game-center/standings-panel";
import { useTournamentField } from "@/hooks/use-tournament-field";
import { useLiveData } from "@/hooks/use-live-data";
import { useStandingsMode } from "@/hooks/use-standings-mode";
import { paymentDetails } from "@/lib/payment";
import { personalSummary } from "@/lib/live";
import { parsePicksData } from "@/lib/scoring-engine";
import { formatDeadline, type SeasonResponse } from "@/lib/season";
import type { HallOfFameSeason } from "@/lib/hall-of-fame";

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

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`overflow-hidden rounded-xl border bg-card shadow-sm ${className}`}>{children}</section>;
}

function CardTitle({ icon: Icon, children, aside }: { icon: React.ElementType; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
      <h2 className="flex items-center gap-2 font-semibold">
        <Icon className="h-4 w-4 text-primary" /> {children}
      </h2>
      {aside}
    </div>
  );
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [season, setSeason] = useState<SeasonResponse | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [pickStats, setPickStats] = useState<PickStats | null>(null);
  const [myBrackets, setMyBrackets] = useState<MyBracket[]>([]);
  const [podium, setPodium] = useState<HallOfFameSeason | null>(null);
  const [finish, setFinish] = useState<{ rank: number; score: number; total: number } | null>(null);
  const [mode, setMode] = useStandingsMode();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!session) return;
    const json = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    Promise.all([json("/api/season"), json("/api/announcements")]).then(([s, a]) => {
      setSeason(s ?? { phase: "no-pool", pool: null, tournament: null, entries: [] });
      setAnnouncements(a ?? []);
    });
  }, [session]);

  // The rules render after loading, so jump to #rules (More → Rules & scoring) once they exist
  useEffect(() => {
    if (season && window.location.hash === "#rules") document.getElementById("rules")?.scrollIntoView();
  }, [season]);

  // Extra data only where the phase needs it
  const phase = season?.phase;
  const poolId = season?.pool?.id ?? null;
  useEffect(() => {
    if (!poolId || !phase) return;
    const json = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (phase === "tournament" || phase === "complete") json(`/api/pool/pick-stats?poolId=${poolId}`).then(setPickStats);
    if (phase === "tournament") json(`/api/brackets?poolId=${poolId}`).then((b) => setMyBrackets((b ?? []).filter((x: MyBracket) => x.status !== "DRAFT")));
    if (phase === "complete" || phase === "preseason") {
      json("/api/hall-of-fame").then((h: { seasons: HallOfFameSeason[] } | null) => {
        const seasons = h?.seasons ?? [];
        setPodium((phase === "complete" ? seasons.find((s) => s.year === season?.tournament?.year) : seasons[0]) ?? null);
      });
    }
    if (phase === "complete") {
      json("/api/leaderboard").then((l) => l?.userRank && setFinish({ rank: l.userRank, score: l.userScore, total: l.totalEntries }));
    }
  }, [phase, poolId, season?.tournament?.year]);

  const live = useLiveData(poolId, null, phase === "tournament");
  const { lookup } = useTournamentField(poolId, !!poolId && !!pickStats?.championshipPicks.length);
  const myIds = useMemo(() => myBrackets.map((b) => b.id), [myBrackets]);
  const firstInStandings = myBrackets.find((b) => live.data?.standings.some((s) => s.bracketId === b.id)) ?? null;
  const picksByGame = useMemo(
    () => new Map(parsePicksData(firstInStandings?.picksData ?? null).map((p) => [p.gameId, p.choices])),
    [firstInStandings?.picksData]
  );
  const summary = useMemo(() => (live.data ? personalSummary(live.data, firstInStandings?.id ?? null, picksByGame) : null), [live.data, firstInStandings?.id, picksByGame]);

  if (status === "loading" || !season) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }
  if (!session) return null;

  const { pool, entries, tournament } = season;
  const firstName = session.user?.name?.split(" ")[0];
  const seasonLine = !pool ? "Join a pool to get started" : !tournament || pool.name.includes(String(tournament.year)) ? pool.name : `${tournament.year} · ${pool.name}`;

  const hero = (() => {
    switch (season.phase) {
      case "no-pool":
        return <Onboarding />;
      case "preseason":
        return (
          <Card className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{tournament?.year ?? "Next"} season</p>
            <h2 className="mt-1 text-xl font-bold">The field is set on Selection Sunday</h2>
            <p className="mt-1 text-sm text-muted-foreground">Brackets open as soon as the teams are in. We&apos;ll let you know.</p>
            {podium?.podium.find((p) => p.place === 1) && (
              <p className="mt-3 flex items-center gap-2 text-sm">
                <Crown className="h-4 w-4 text-yellow-500" /> Reigning champion ({podium.year}):{" "}
                <span className="font-semibold">{podium.podium.find((p) => p.place === 1)!.name}</span>
              </p>
            )}
          </Card>
        );
      case "entry":
        return (
          <div className="space-y-4">
            <DeadlineCountdown deadline={pool!.deadline} />
            <EntryChecklist pool={pool!} entries={entries} />
          </div>
        );
      case "tournament":
        return (
          <div className="space-y-4">
            {summary?.entry ? (
              <YourNight
                entry={summary.entry}
                title={firstInStandings?.name ?? summary.entry.bracketName}
                anyLive={!!live.data?.anyLive}
                alive={summary.alive}
                biggestSwing={summary.biggestSwing}
                onRooting={() => router.push("/game-center?view=rooting")}
                onLiveStandings={() => live.data?.anyLive && setMode("live")}
              />
            ) : (
              !live.loading && (
                <Card className="p-5">
                  <h2 className="text-lg font-bold">The tournament is on</h2>
                  <p className="mt-1 text-sm text-muted-foreground">You don&apos;t have a submitted bracket this season, but you can follow every game.</p>
                </Card>
              )
            )}
            {live.data ? (
              <TodayGames data={live.data} picksByGame={picksByGame} />
            ) : live.loading ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : (
              <Card className="p-5 text-sm text-muted-foreground">
                Live scores are unavailable right now.{" "}
                <Link href="/game-center" className="font-semibold text-primary">
                  Open Game Center
                </Link>
              </Card>
            )}
          </div>
        );
      case "complete":
        return <SeasonRecap year={tournament?.year ?? null} season={podium} you={finish} />;
    }
  })();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hi, ${firstName ?? "there"}`}
        description={seasonLine}
        actions={
          season.phase === "entry" && pool?.status === "OPEN" ? (
            <Button asChild>
              <Link href="/brackets/new">
                <Plus className="mr-1.5 h-4 w-4" /> New bracket
              </Link>
            </Button>
          ) : season.phase === "tournament" ? (
            <Button asChild variant="outline">
              <Link href="/game-center">
                <Radio className="mr-1.5 h-4 w-4" /> Game Center
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          {hero}
          {announcements.length > 0 && <Announcements items={announcements} />}
          {pickStats && pickStats.championshipPicks.length > 0 && <ChampionshipPicks stats={pickStats} lookup={lookup} />}
        </div>
        <aside className="space-y-6">
          {season.phase === "tournament" && live.data && live.data.standings.length > 0 && (
            <StandingsPanel standings={live.data.standings} mode={mode} onModeChange={setMode} anyLive={live.data.anyLive} myBracketIds={myIds} />
          )}
          {pool && <PoolCard pool={pool} />}
        </aside>
      </div>

      {season.phase !== "no-pool" && <ScoringRules deadline={pool?.deadline ?? null} />}
    </div>
  );
}

function Onboarding() {
  const steps = [
    { href: "/join", title: "Join a pool", detail: "Enter the invite code from your pool admin" },
    { href: "/brackets/new", title: "Fill out a bracket", detail: "Pick all 63 games" },
    { href: "/payment", title: "Pay the entry fee", detail: "Venmo or PayPal, set by your pool" },
  ];
  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Trophy className="h-5 w-5 text-primary" /> Welcome to PickNRoll
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Three steps to get in the game.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {steps.map((s, i) => (
          <Link key={s.href} href={s.href} className="flex items-center gap-3 rounded-lg border bg-background p-3 transition-colors hover:border-primary">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{i + 1}</span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{s.title}</span>
              <span className="block text-xs text-muted-foreground">{s.detail}</span>
            </span>
            <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </Card>
  );
}

function Announcements({ items }: { items: Announcement[] }) {
  return (
    <Card>
      <CardTitle icon={Megaphone}>Announcements</CardTitle>
      <div className="space-y-2 px-4 pb-4">
        {items.slice(0, 3).map((a) => (
          <div key={a.id} className={`rounded-lg border p-3 ${a.pinned ? "border-primary/20 bg-primary/5" : "bg-muted/40"}`}>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              {a.title}
              {a.pinned && <Pin className="h-3 w-3 text-primary" />}
            </h3>
            <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{a.message}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {a.author.name} · {new Date(a.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ChampionshipPicks({ stats, lookup }: { stats: PickStats; lookup: ReturnType<typeof useTournamentField>["lookup"] }) {
  const max = stats.championshipPicks[0].percentage;
  return (
    <Card>
      <CardTitle icon={Crown} aside={<span className="text-xs text-muted-foreground">{stats.totalBrackets} brackets</span>}>
        Who the pool picked to win it all
      </CardTitle>
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
    </Card>
  );
}

function PoolCard({ pool }: { pool: NonNullable<SeasonResponse["pool"]> }) {
  const copy = () => {
    navigator.clipboard.writeText(pool.inviteCode);
    toast.success("Invite code copied");
  };
  return (
    <Card>
      <CardTitle icon={Users}>{pool.name}</CardTitle>
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
    </Card>
  );
}
