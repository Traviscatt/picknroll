"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, DollarSign, Edit, Lock, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { BracketStatusBadge } from "@/components/shared/bracket-status-badge";
import { BracketMenu } from "@/components/shared/bracket-menu";
import { DesktopBracketView, type BracketResults } from "@/components/bracket/DesktopBracketView";
import { BracketRounds } from "@/components/bracket/bracket-rounds";
import type { PickerTeam } from "@/components/picker/game-picker";
import { useTournamentField } from "@/hooks/use-tournament-field";
import { bracketGames, progress, toPicks } from "@/lib/picker";
import { parsePicksData } from "@/lib/scoring-engine";
import { bracketActions } from "@/lib/season";

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
  familyMember?: { id: string; name: string } | null;
  pool?: { id: string; deadline: string; status: string } | null;
}

export default function BracketDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id: bracketId } = useParams<{ id: string }>();
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [eliminated, setEliminated] = useState<Set<string>>(new Set());
  const [pct, setPct] = useState<Record<string, Record<string, number>>>({});
  const { field, loading: fieldLoading } = useTournamentField(bracket?.poolId ?? null, !!bracket);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!session || !bracketId) return;
    fetch(`/api/brackets/${bracketId}`).then(async (res) => {
      if (res.ok) {
        const data: Bracket = await res.json();
        setBracket(data);
        // Results and pool shares always come from the bracket's own pool (past seasons included)
        const pool = data.poolId ? `?poolId=${encodeURIComponent(data.poolId)}` : "";
        const [elim, stats] = await Promise.all([
          fetch(`/api/eliminated-teams${pool}`).then((r) => (r.ok ? r.json() : null)),
          data.poolId ? fetch(`/api/pool/pick-stats${pool}`).then((r) => (r.ok ? r.json() : null)) : null,
        ]).catch(() => [null, null]);
        setEliminated(new Set(elim?.eliminated ?? []));
        setPct(stats?.gamePicks ?? {});
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
  const picks = useMemo(() => toPicks(parsePicksData(bracket?.picksData ?? null)), [bracket?.picksData]);
  const teams = useMemo(() => new Map((field?.teams ?? []).map((t) => [t.id, t])), [field]);
  const team = (id: string): PickerTeam => {
    const t = teams.get(id);
    return t ? { id, name: t.name, seed: t.seed, logo: t.logo, record: t.record } : { id, name: id, seed: 0, logo: null, record: null };
  };
  const results: BracketResults = useMemo(
    () => ({
      winners: new Map((bracket?.completedGames ?? []).flatMap((g) => (g.winnerBracketId ? [[g.bracketGameId, g.winnerBracketId] as const] : []))),
      eliminated,
      pct,
    }),
    [bracket?.completedGames, eliminated, pct]
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
  const back = isOwner ? "/brackets" : "/leaderboard";

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

  const stats: [string, React.ReactNode][] = [
    ["Score", <span key="s" className="text-primary">{bracket.totalScore + bracket.bonusScore}</span>],
    ...(bracket.rank != null ? [["Rank", `${bracket.rank}${bracket.totalInPool ? ` / ${bracket.totalInPool}` : ""}`] as [string, React.ReactNode]] : []),
    ...(bracket.bonusScore > 0 ? [["Bonus", `+${bracket.bonusScore}`] as [string, React.ReactNode]] : []),
    ["Tiebreaker", bracket.tiebreaker ?? "—"],
    ...(prog.done < prog.total ? [["Picked", `${prog.done} / ${prog.total}`] as [string, React.ReactNode]] : []),
  ];

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
          isOwner && (
            <>
              {actions.canEdit && (
                <Button asChild size="sm">
                  <Link href={`/brackets/new?editId=${bracket.id}`}>
                    <Edit className="mr-1.5 h-4 w-4" /> Edit picks
                  </Link>
                </Button>
              )}
              {submitted && !bracket.paid && (
                <Button asChild size="sm" variant="outline">
                  <Link href="/payment">
                    <DollarSign className="mr-1.5 h-4 w-4" /> Pay
                  </Link>
                </Button>
              )}
              <BracketMenu
                bracket={bracket}
                canEdit={false}
                canDelete={actions.canDelete}
                showView={false}
                onDownload={picks.size ? downloadPdf : undefined}
                onDeleted={() => router.push("/brackets")}
              />
            </>
          )
        }
      />

      <div className="flex divide-x overflow-x-auto rounded-xl border bg-card shadow-sm">
        {stats.map(([label, value]) => (
          <div key={label} className="min-w-[84px] flex-1 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="text-xl font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

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
      ) : (
        <>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              <span className="font-semibold text-emerald-700">Green ✓</span> right
            </span>
            <span>
              <span className="line-through">Struck</span> wrong
            </span>
            <span>
              <span className="text-muted-foreground/60">Faded</span> knocked out
            </span>
            {Object.keys(pct).length > 0 && <span>% of the pool made the same pick at that rank</span>}
          </p>
          <div className="hidden lg:block">
            <DesktopBracketView regions={regions} picks={picks} byId={byId} team={team} results={results} />
          </div>
          <div className="lg:hidden">
            <BracketRounds regions={regions} games={games} picks={picks} team={team} results={results} tiebreaker={bracket.tiebreaker} />
          </div>
        </>
      )}

      <p className="flex flex-wrap justify-center gap-x-3 gap-y-1 pt-2 text-xs text-muted-foreground">
        <span>Created {new Date(bracket.createdAt).toLocaleDateString()}</span>
        <span>· Updated {new Date(bracket.updatedAt).toLocaleDateString()}</span>
        {bracket.submittedAt && <span>· Submitted {new Date(bracket.submittedAt).toLocaleDateString()}</span>}
      </p>
    </div>
  );
}
