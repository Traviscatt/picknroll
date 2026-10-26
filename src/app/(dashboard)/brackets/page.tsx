"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Plus, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { BracketStatusBadge } from "@/components/shared/bracket-status-badge";
import { BracketMenu } from "@/components/shared/bracket-menu";
import { cn } from "@/lib/utils";
import { bracketActions, nextStep, seasonLabel, type SeasonEntry, type SeasonPhase, type SeasonResponse } from "@/lib/season";
import { EntryCard } from "@/components/bracket/entry-card";
import { PointsLegend } from "@/components/bracket/points-by-round";
import { ordinal } from "@/components/game-center/parts";
import { useTournamentField } from "@/hooks/use-tournament-field";

interface Bracket {
  id: string;
  name: string;
  entryName: string;
  status: string;
  totalScore: number;
  bonusScore: number;
  paid: boolean;
  pool: { id: string; name: string; deadline: string; status: string; tournament: { year: number } } | null;
  rank: number | null;
  totalInPool: number | null;
}

type ScoredEntry = SeasonEntry & { summary: NonNullable<SeasonEntry["summary"]> };

const finish = (b: Bracket) => (b.rank && b.totalInPool ? `${ordinal(b.rank)} of ${b.totalInPool}` : "–");
const bestFinish = (list: Bracket[]) => {
  const ranks = list.flatMap((b) => (b.rank ? [b.rank] : []));
  return ranks.length ? ordinal(Math.min(...ranks)) : null;
};

const SEASON_NOTE: Record<SeasonPhase, string> = {
  "no-pool": "",
  preseason: "Opens once the field is announced",
  entry: "Editable until the deadline",
  tournament: "Picks are locked",
  complete: "Season over",
};

export default function BracketsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [season, setSeason] = useState<SeasonResponse | null>(null);
  const [brackets, setBrackets] = useState<Bracket[] | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const load = useCallback(() => {
    const json = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    Promise.all([json("/api/season"), json("/api/brackets")]).then(([s, b]) => {
      setSeason(s ?? { phase: "no-pool", pool: null, tournament: null, entries: [] });
      setBrackets(b ?? []);
    });
  }, []);

  useEffect(() => {
    if (session) load();
  }, [session, load]);

  const currentPoolId = season?.pool?.id ?? null;
  const { lookup } = useTournamentField(currentPoolId, !!season?.entries.some((e) => e.summary));
  const past = useMemo(() => {
    const groups = new Map<string, Bracket[]>();
    for (const b of brackets ?? []) {
      if (currentPoolId && b.pool?.id === currentPoolId) continue;
      const key = b.pool ? String(b.pool.tournament.year) : "Not in a pool";
      groups.set(key, [...(groups.get(key) ?? []), b]);
    }
    return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [brackets, currentPoolId]);

  if (status === "loading" || !season || !brackets) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }
  if (!session) return null;

  const { pool, entries, phase, tournament } = season;
  const locked = pool ? bracketActions({ status: "SUBMITTED", pool }).locked : false;
  const canStart = phase === "entry" && !locked;
  const showScores = phase === "tournament" || phase === "complete";
  const seasonNote = SEASON_NOTE[phase];
  // Once picks lock, submitted entries get standing cards; drafts (and everything before the deadline) stay as rows
  const standings = entries.filter((e): e is ScoredEntry => !!e.summary);
  const unscored = entries.filter((e) => !e.summary);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My brackets"
        description={pool ? seasonLabel(tournament?.year, pool.name) : "Join a pool to enter a bracket"}
        actions={
          canStart ? (
            <Button asChild>
              <Link href="/brackets/new">
                <Plus className="mr-1.5 h-4 w-4" /> New bracket
              </Link>
            </Button>
          ) : null
        }
      />

      {standings.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">This season</h2>
            <span className="text-xs text-muted-foreground">{seasonNote}</span>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {standings.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                lookup={lookup}
                poolEntries={pool?.entries ?? 0}
                leaderScore={pool?.leaderScore ?? null}
                canDelete={bracketActions({ status: entry.status, pool }).canDelete}
                onDeleted={load}
              />
            ))}
          </div>
          <PointsLegend />
        </section>
      )}

      {(standings.length === 0 || unscored.length > 0) && (
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <h2 className="font-semibold">{standings.length ? "Not submitted" : "This season"}</h2>
          <span className="text-xs text-muted-foreground">{standings.length ? "Drafts don't count once picks lock" : seasonNote}</span>
        </div>
        {unscored.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <Trophy className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="mb-4 text-sm text-muted-foreground">{pool ? "No brackets yet this season." : "You're not in a pool yet."}</p>
            {canStart ? (
              <Button asChild>
                <Link href="/brackets/new">Start your bracket</Link>
              </Button>
            ) : !pool ? (
              <Button asChild variant="outline">
                <Link href="/join">Join a pool</Link>
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="divide-y">
            {unscored.map((entry) => {
              const actions = bracketActions({ status: entry.status, pool });
              const step = nextStep(entry, actions.locked);
              const pct = entry.totalGames ? (entry.picked / entry.totalGames) * 100 : 0;
              return (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/brackets/${entry.id}`} className="truncate font-medium hover:underline">
                        {entry.name}
                      </Link>
                      <BracketStatusBadge status={entry.status} paid={entry.paid} paymentPending={entry.paymentPending} />
                    </div>
                    {showScores && entry.status !== "DRAFT" ? (
                      <p className="text-xs text-muted-foreground">
                        <span className="text-base font-bold text-primary tabular-nums">{entry.totalScore + entry.bonusScore}</span> pts · for {entry.entryName}
                      </p>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 max-w-40 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className={cn("h-full rounded-full", pct === 100 ? "bg-emerald-500" : "bg-primary")} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {entry.picked}/{entry.totalGames} picked · for {entry.entryName}
                        </span>
                      </div>
                    )}
                  </div>
                  <Button asChild size="sm" variant={step.primary ? "default" : "ghost"}>
                    <Link href={step.href}>{step.label}</Link>
                  </Button>
                  <BracketMenu bracket={entry} canEdit={actions.canEdit} canDelete={actions.canDelete} showView={step.label !== "View"} onDeleted={load} />
                </div>
              );
            })}
          </div>
        )}
      </section>
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Past seasons</h2>
          {/* Desktop: one table */}
          <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  {["Season", "Bracket", "Entry for", "Finish", "Score", ""].map((h) => (
                    <th key={h} className="px-4 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {past.flatMap(([year, list]) =>
                  list.map((b) => (
                    <tr key={b.id}>
                      <td className="px-4 py-3 text-muted-foreground">{year}</td>
                      <td className="px-4 py-3">
                        <Link href={`/brackets/${b.id}`} className="font-semibold hover:underline">
                          {b.name}
                        </Link>
                        {b.status === "DRAFT" && <BracketStatusBadge status="DRAFT" className="ml-2" />}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{b.entryName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{finish(b)}</td>
                      <td className="px-4 py-3 font-bold tabular-nums text-primary">{b.status !== "DRAFT" ? b.totalScore + b.bonusScore : "–"}</td>
                      <td className="px-4 py-3 text-right">
                        <BracketMenu bracket={b} canEdit={bracketActions(b).canEdit} canDelete={bracketActions(b).canDelete} onDeleted={load} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Phones: collapsed by year */}
          {past.map(([year, list]) => (
            <details key={year} className="group overflow-hidden rounded-xl border bg-card shadow-sm md:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <span className="font-semibold">{year}</span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {list.length} bracket{list.length === 1 ? "" : "s"}
                  {bestFinish(list) ? ` · best finish ${bestFinish(list)}` : ""}
                  <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                </span>
              </summary>
              <div className="divide-y border-t">
                {list.map((b) => {
                  const actions = bracketActions(b);
                  return (
                    <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/brackets/${b.id}`} className="truncate font-medium hover:underline">
                            {b.name}
                          </Link>
                          <BracketStatusBadge status={b.status} paid={b.paid} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          for {b.entryName}
                          {finish(b) !== "–" ? ` · ${finish(b)}` : ""}
                        </p>
                      </div>
                      {b.status !== "DRAFT" && <span className="font-bold text-primary tabular-nums">{b.totalScore + b.bonusScore}</span>}
                      <BracketMenu bracket={b} canEdit={actions.canEdit} canDelete={actions.canDelete} onDeleted={load} />
                    </div>
                  );
                })}
              </div>
            </details>
          ))}
        </section>
      )}
    </div>
  );
}
