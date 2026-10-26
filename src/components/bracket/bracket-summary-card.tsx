import Image from "next/image";
import { cn } from "@/lib/utils";
import type { BracketSummary, TeamStatus } from "@/lib/bracket-summary";
import type { FieldLookup } from "@/lib/tournament-field";
import { getScoringRule } from "@/lib/scoring";
import { ordinal } from "@/components/game-center/parts";
import { PointsByRound } from "./points-by-round";

const CHAMPION_STATE: Record<TeamStatus["state"], string> = {
  won: "Won it all",
  lost: "Lost the final",
  out: "Knocked out",
  pending: "Still alive",
};

interface BracketSummaryCardProps {
  summary: BracketSummary;
  rank: number | null;
  total: number | null;
  lookup: FieldLookup;
  /** Share of the pool with the same champion (after the deadline) */
  championPct?: number;
  /** Before the deadline: picks made instead of standings */
  picked?: { done: number; total: number } | null;
}

/** Champion pick + standing + points by round. One team-colored card on phones, a row of three cards on desktop. */
export function BracketSummaryCard({ summary, rank, total, lookup, championPct, picked }: BracketSummaryCardProps) {
  const champ = summary.champion;
  const worth = getScoringRule(6)?.pointsPerChoice[0] ?? 0;
  const champLine = champ
    ? [picked ? `Worth ${worth} if they win it all` : `${CHAMPION_STATE[champ.state]} · worth ${worth}`, championPct != null ? `${championPct}% of the pool agrees` : null].filter(Boolean).join(" · ")
    : "No champion picked yet";
  const stats: [string, string][] = picked
    ? [
        [`${picked.done}/${picked.total}`, "games picked"],
        [String(summary.max), "max possible"],
      ]
    : [
        [String(summary.score), summary.bonus ? `points (+${summary.bonus} bonus)` : "points"],
        [rank ? ordinal(rank) : "–", total ? `of ${total}` : "rank"],
        [String(summary.max), "max possible"],
        [String(summary.inPlay), "still in play"],
      ];

  const championBlock = (big: boolean) => (
    <div className="flex min-w-0 items-center gap-3">
      <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-card", big ? "h-16 w-16" : "h-12 w-12")}>
        {champ && lookup.logo(champ.team) ? (
          <Image src={lookup.logo(champ.team)!} alt="" width={40} height={40} className={cn("object-contain", big ? "h-10 w-10" : "h-8 w-8", champ.state === "out" && "opacity-40")} unoptimized />
        ) : null}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-team-secondary">Your champion</p>
        <p className={cn("truncate font-bold", big ? "text-2xl" : "text-xl", champ?.state === "out" && "line-through opacity-70")}>{champ ? lookup.name(champ.team) : "–"}</p>
        <p className="text-xs opacity-80">{champLine}</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Phones and tablets */}
      <section className="space-y-4 rounded-2xl bg-primary p-4 text-primary-foreground lg:hidden">
        {championBlock(false)}
        <div className="h-px bg-primary-foreground/15" />
        <div className="flex justify-between gap-2">
          {stats.map(([value, label]) => (
            <div key={label} className="min-w-0">
              <p className="text-xl font-bold tabular-nums">{value}</p>
              <p className="truncate text-[10px] opacity-75">{label}</p>
            </div>
          ))}
        </div>
        <PointsByRound rounds={summary.rounds} labels tone="dark" />
      </section>

      {/* Desktop */}
      <section className="hidden gap-4 lg:grid lg:grid-cols-[minmax(0,360px)_auto_minmax(0,1fr)]">
        <div className="flex items-center rounded-xl bg-primary p-5 text-primary-foreground">{championBlock(true)}</div>
        <div className="flex divide-x rounded-xl border bg-card shadow-sm">
          {stats.map(([value, label]) => (
            <div key={label} className="flex flex-col justify-center px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col justify-center gap-3 rounded-xl border bg-card px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-semibold uppercase tracking-wide text-muted-foreground">Points by round</span>
            <span className="text-muted-foreground">
              {summary.inPlay} still possible · {summary.rounds.reduce((s, r) => s + r.gone, 0)} gone
            </span>
          </div>
          <PointsByRound rounds={summary.rounds} labels />
        </div>
      </section>
    </>
  );
}
