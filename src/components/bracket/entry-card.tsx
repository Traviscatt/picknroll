"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SeasonEntry } from "@/lib/season";
import type { FieldLookup } from "@/lib/tournament-field";
import { BracketStatusBadge } from "@/components/shared/bracket-status-badge";
import { BracketMenu } from "@/components/shared/bracket-menu";
import { ordinal } from "@/components/game-center/parts";
import { PointsByRound } from "./points-by-round";

interface EntryCardProps {
  entry: SeasonEntry & { summary: NonNullable<SeasonEntry["summary"]> };
  lookup: FieldLookup;
  poolEntries: number;
  leaderScore: number | null;
  canDelete: boolean;
  onDeleted: () => void;
}

function standingNote(score: number, max: number, rank: number | null, leaderScore: number | null, finished: boolean) {
  if (leaderScore == null) return null;
  const behind = leaderScore - score;
  if (finished) return rank === 1 ? "Won the pool" : `Finished ${rank ? ordinal(rank) : ""} · ${behind} behind the winner`;
  if (rank === 1) return "Leading the pool";
  return max >= leaderScore ? `${behind} behind the leader · can still win` : `${behind} behind the leader · can't catch 1st`;
}

/** An entry once picks lock: standing, champion and Final Four status, points by round */
export function EntryCard({ entry, lookup, poolEntries, leaderScore, canDelete, onDeleted }: EntryCardProps) {
  const { summary } = entry;
  const champ = summary.champion;
  const alive = summary.finalFour.filter((t) => t.state === "pending" || t.state === "won").length;
  const regionsDone = !summary.finalFour.some((t) => t.state === "pending");
  const finished = !!champ && champ.state !== "pending" && summary.inPlay === 0;
  const note = standingNote(summary.score, summary.max, entry.rank, leaderScore, finished);
  const stats: [string, string, boolean][] = [
    [String(summary.score), "points", true],
    [entry.rank ? ordinal(entry.rank) : "–", `of ${poolEntries}`, false],
    [String(summary.max), "max possible", false],
    [String(summary.inPlay), "still in play", false],
  ];

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-2">
        <Link href={`/brackets/${entry.id}`} className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-base font-semibold sm:text-lg">{entry.name}</span>
            <BracketStatusBadge status={entry.status} paid={entry.paid} paymentPending={entry.paymentPending} />
          </span>
          <span className="block text-xs text-muted-foreground sm:text-sm">for {entry.entryName}</span>
        </Link>
        <BracketMenu bracket={entry} canEdit={false} canDelete={canDelete} onDeleted={onDeleted} />
        <Link href={`/brackets/${entry.id}`} aria-label={`Open ${entry.name}`} className="mt-1 sm:hidden">
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex gap-5">
          {stats.map(([value, label, primary], i) => (
            <div key={label} className={cn(i === 3 && "hidden sm:block")}>
              <p className={cn("text-xl font-bold tabular-nums sm:text-2xl", primary && "text-primary")}>{value}</p>
              <p className="text-[11px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {champ && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-sm font-semibold">
              <Crown className="h-3.5 w-3.5 text-amber-600" />
              {lookup.logo(champ.team) && (
                <Image src={lookup.logo(champ.team)!} alt="" width={18} height={18} className={cn("h-[18px] w-[18px] object-contain", champ.state === "out" && "opacity-40")} unoptimized />
              )}
              <span className={cn(champ.state === "out" && "line-through opacity-60")}>{lookup.name(champ.team)}</span>
            </span>
          )}
          <span className="flex items-center gap-1" aria-label={`Final Four picks: ${alive} of ${summary.finalFour.length} ${regionsDone ? "made it" : "alive"}`}>
            {summary.finalFour.map((t) =>
              lookup.logo(t.team) ? (
                <Image key={t.team} src={lookup.logo(t.team)!} alt={lookup.name(t.team)} title={lookup.name(t.team)} width={20} height={20} className={cn("h-5 w-5 object-contain", t.state === "out" || t.state === "lost" ? "opacity-30 grayscale" : "")} unoptimized />
              ) : (
                <span key={t.team} className="h-5 w-5 rounded-full bg-muted" />
              )
            )}
            <span className="ml-1 text-xs text-muted-foreground">{regionsDone ? `${alive} of 4 made the Final Four` : `${alive} of 4 alive`}</span>
          </span>
        </div>
      </div>

      <PointsByRound rounds={summary.rounds} labels />

      <div className="flex flex-wrap items-center justify-between gap-3">
        {note && <p className="text-xs text-muted-foreground sm:text-sm">{note}</p>}
        <div className="hidden gap-2 sm:flex">
          <Button asChild variant="outline" size="sm">
            <Link href={`/brackets/${entry.id}?view=leader`}>Compare with leader</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`/brackets/${entry.id}`}>
              Open bracket <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
