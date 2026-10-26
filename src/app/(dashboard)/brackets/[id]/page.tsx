"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, DollarSign, Edit, Lock, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { BracketStatusBadge } from "@/components/shared/bracket-status-badge";
import { BracketMenu } from "@/components/shared/bracket-menu";
import { DesktopBracketView, type BracketResults } from "@/components/bracket/DesktopBracketView";
import { BracketSections } from "@/components/bracket/bracket-sections";
import { BracketSummaryCard } from "@/components/bracket/bracket-summary-card";
import { CompareLeader } from "@/components/bracket/compare-leader";
import { ComparePool } from "@/components/bracket/compare-pool";
import { PointsLegend } from "@/components/bracket/points-by-round";
import type { PickerTeam } from "@/components/picker/game-picker";
import { useTournamentField } from "@/hooks/use-tournament-field";
import { cn } from "@/lib/utils";
import { bracketGames, progress, toPicks } from "@/lib/picker";
import { parsePicksData } from "@/lib/scoring-engine";
import { bracketActions } from "@/lib/season";
import type { BracketSummary } from "@/lib/bracket-summary";

interface Bracket {
  id: string;
  poolId: string | null;
  name: string;
  entryName: string;
  status: string;
  totalScore: number;
  bonusScore: number;
  tiebreaker: number | null;
  paid: boolean;
  picksData: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  isOwner: boolean;
  ownerName: string | null;
  rank: number | null;
  totalInPool: number | null;
  completedGames: { bracketGameId: string; winnerBracketId: string | null }[];
  eliminated: string[];
  summary: BracketSummary | null;
  familyMember?: { id: string; name: string } | null;
  pool?: { id: string; deadline: string; status: string } | null;
}

type View = "picks" | "leader" | "pool";
const VIEWS: [View, string][] = [
  ["picks", "My picks"],
  ["leader", "vs. Leader"],
  ["pool", "vs. Pool"],
];

export default function BracketDetailPage() {
  return (
    <Suspense>
      <BracketDetail />
    </Suspense>
  );
}

function BracketDetail() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id: bracketId } = useParams<{ id: string }>();
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [pct, setPct] = useState<Record<string, Record<string, number>>>({});
  const [view, setView] = useState<View>(() => (searchParams.get("view") === "leader" ? "leader" : searchParams.get("view") === "pool" ? "pool" : "picks"));
  const { field, lookup, loading: fieldLoading } = useTournamentField(bracket?.poolId ?? null, !!bracket);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!session || !bracketId) return;
    fetch(`/api/brackets/${bracketId}`).then(async (res) => {
      if (res.ok) {
        const data: Bracket = await res.json();
        setBracket(data);
        if (data.poolId) {
          const stats = await fetch(`/api/pool/pick-stats?poolId=${encodeURIComponent(data.poolId)}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null);
          setPct(stats?.gamePicks ?? {});
        }
      } else if (res.status === 403) {
        toast.error("Brackets are hidden until the submission deadline passes");
        router.push("/leaderboard");
      } else {
        router.push("/brackets");
      }
    });
  }, [session, bracketId, router]);

  const regions = useMemo(() => field?.tournament.regions ?? [], [field]);
  const games = useMemo(() => (regions.length === 4 ? bracketGames(regions) : []), [regions]);
  const byId = useMemo(() => new Map(games.map((g) => [g.gameId, g])), [games]);
  const pickList = useMemo(() => parsePicksData(bracket?.picksData ?? null), [bracket?.picksData]);
  const picks = useMemo(() => toPicks(pickList), [pickList]);
  const teams = useMemo(() => new Map((field?.teams ?? []).map((t) => [t.id, t])), [field]);
  const team = (id: string): PickerTeam => {
    const t = teams.get(id);
    return t ? { id, name: t.name, seed: t.seed, logo: t.logo, record: t.record } : { id, name: id, seed: 0, logo: null, record: null };
  };
  const results: BracketResults = useMemo(
    () => ({
      winners: new Map((bracket?.completedGames ?? []).flatMap((g) => (g.winnerBracketId ? [[g.bracketGameId, g.winnerBracketId] as const] : []))),
      eliminated: new Set(bracket?.eliminated ?? []),
      pct,
    }),
    [bracket?.completedGames, bracket?.eliminated, pct]
  );

  if (status === "loading" || !bracket || fieldLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }
  if (!session) return null;

  const isOwner = bracket.isOwner !== false;
  const actions = bracketActions(bracket);
  const prog = games.length ? progress(picks, games) : { done: picks.size, total: 63 };
  const submitted = bracket.status !== "DRAFT";
  const locked = !!bracket.pool && new Date() > new Date(bracket.pool.deadline);
  const canCompare = submitted && locked;
  const activeView: View = canCompare ? view : "picks";
  const back = isOwner ? "/brackets" : "/leaderboard";
  const championPct = bracket.summary?.champion ? pct["championship-r6-g1"]?.[`0:${bracket.summary.champion.team}`] : undefined;

  const chooseView = (v: View) => {
    setView(v);
    const url = new URL(window.location.href);
    if (v === "picks") url.searchParams.delete("view");
    else url.searchParams.set("view", v);
    window.history.replaceState(null, "", url);
  };

  const downloadPdf = async () => {
    const res = await fetch(`/api/brackets/${bracket.id}/pdf`);
    if (!res.ok) {
      toast.error((await res.json().catch(() => ({}))).error || "Couldn't make the PDF");
      return;
    }
    const url = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement("a"), { href: url, download: `${bracket.name.replace(/[^a-zA-Z0-9]/g, "_") || "bracket"}_picks.pdf` });
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggle = canCompare && (
    <div className="flex gap-1 rounded-lg bg-muted p-1" role="tablist" aria-label="Bracket view">
      {VIEWS.map(([v, label]) => (
        <button
          key={v}
          type="button"
          role="tab"
          aria-selected={activeView === v}
          onClick={() => chooseView(v)}
          className={cn("flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors", activeView === v ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground")}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        leading={
          <Button variant="ghost" size="icon" asChild className="-ml-2 mt-0.5 shrink-0">
            <Link href={back} aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
        }
        title={<span className="block truncate">{isOwner ? bracket.name : `${bracket.ownerName}'s bracket`}</span>}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {isOwner ? `for ${bracket.entryName}` : `${bracket.name} · ${bracket.entryName}`}
            {bracket.familyMember && (
              <span className="inline-flex items-center gap-1 text-xs">
                <Users className="h-3 w-3" /> {bracket.familyMember.name}
              </span>
            )}
            <BracketStatusBadge status={bracket.status} paid={bracket.paid} isOwner={isOwner} />
            {submitted && actions.locked && (
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" /> Locked
              </span>
            )}
          </span>
        }
        actions={
          <>
            {toggle && <div className="hidden lg:block">{toggle}</div>}
            {isOwner && actions.canEdit && (
              <Button asChild size="sm">
                <Link href={`/brackets/new?editId=${bracket.id}`}>
                  <Edit className="mr-1.5 h-4 w-4" /> Edit picks
                </Link>
              </Button>
            )}
            {isOwner && submitted && !bracket.paid && (
              <Button asChild size="sm" variant="outline">
                <Link href="/payment">
                  <DollarSign className="mr-1.5 h-4 w-4" /> Pay
                </Link>
              </Button>
            )}
            {isOwner && (
              <BracketMenu bracket={bracket} canEdit={false} canDelete={actions.canDelete} showView={false} onDownload={picks.size ? downloadPdf : undefined} onDeleted={() => router.push("/brackets")} />
            )}
          </>
        }
      />

      {bracket.summary && picks.size > 0 && (
        <BracketSummaryCard
          summary={bracket.summary}
          rank={bracket.rank}
          total={bracket.totalInPool}
          lookup={lookup}
          championPct={locked ? championPct : undefined}
          picked={locked && submitted ? null : prog}
        />
      )}

      {toggle && <div className="lg:hidden">{toggle}</div>}

      {picks.size === 0 ? (
        <div className="rounded-xl border bg-card px-4 py-12 text-center">
          <Trophy className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No picks saved yet.</p>
          {isOwner && actions.canEdit && (
            <Button asChild className="mt-4">
              <Link href={`/brackets/new?editId=${bracket.id}`}>Start picking</Link>
            </Button>
          )}
        </div>
      ) : games.length === 0 ? (
        <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">The tournament field for this bracket isn&apos;t available.</p>
      ) : activeView === "leader" ? (
        <CompareLeader bracketId={bracket.id} regions={regions} team={team} eliminated={results.eliminated} />
      ) : activeView === "pool" ? (
        <ComparePool picks={pickList} results={results} regions={regions} team={team} />
      ) : (
        <>
          <div className="hidden lg:block">
            <DesktopBracketView regions={regions} picks={picks} byId={byId} team={team} results={results} />
          </div>
          <div className="space-y-3 lg:hidden">
            <PointsLegend />
            {bracket.summary && (
              <BracketSections regions={regions} games={games} picks={picks} team={team} results={results} rounds={bracket.summary.rounds} tiebreaker={bracket.tiebreaker} />
            )}
          </div>
        </>
      )}

      <p className="flex flex-wrap justify-center gap-x-3 gap-y-1 pt-2 text-xs text-muted-foreground">
        <span>Created {new Date(bracket.createdAt).toLocaleDateString()}</span>
        <span>· Updated {new Date(bracket.updatedAt).toLocaleDateString()}</span>
        {bracket.submittedAt && <span>· Submitted {new Date(bracket.submittedAt).toLocaleDateString()}</span>}
        {bracket.tiebreaker != null && <span className="lg:inline">· Tiebreaker {bracket.tiebreaker}</span>}
      </p>
    </div>
  );
}

