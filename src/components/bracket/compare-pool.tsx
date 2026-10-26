"use client";

import Image from "next/image";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BracketPick } from "@/lib/bracket-validation";
import { boldPicks, type BoldPick } from "@/lib/bracket-summary";
import type { PickerTeam } from "@/components/picker/game-picker";
import type { BracketResults } from "./DesktopBracketView";
import { gameLabel } from "./labels";

/** Your 1st choices few others made: still alive (where you gain the most) and the ones that already paid off */
export function ComparePool({ picks, results, regions, team }: { picks: BracketPick[]; results: BracketResults; regions: string[]; team: (id: string) => PickerTeam }) {
  if (!results.pct || Object.keys(results.pct).length === 0) {
    return <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">Pool picks appear once brackets lock.</p>;
  }
  const { alive, paidOff } = boldPicks(picks, results.pct, results.winners, results.eliminated);
  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 rounded-xl border bg-card p-4 text-sm shadow-sm">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        Picks few others made are where you gain the most on the pool. These are your 1st choices that 20% or less of the pool shares.
      </p>
      <List title="Bold picks still alive" empty="None left. Your remaining picks are with the crowd." picks={alive} regions={regions} team={team} />
      <List title="Bold picks that paid off" empty="None yet." picks={paidOff} regions={regions} team={team} paid />
    </div>
  );
}

function List({ title, empty, picks, regions, team, paid = false }: { title: string; empty: string; picks: BoldPick[]; regions: string[]; team: (id: string) => PickerTeam; paid?: boolean }) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground">{picks.length}</span>
      </div>
      {picks.length === 0 ? (
        <p className="rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="grid gap-2 lg:grid-cols-2">
          {picks.map((p) => {
            const t = team(p.team);
            return (
              <div key={p.gameId} className={cn("flex items-center gap-3 rounded-xl border px-3 py-2.5", paid ? "bg-hit-soft" : "bg-card")}>
                {t.logo ? <Image src={t.logo} alt="" width={24} height={24} className="h-6 w-6 shrink-0 object-contain" unoptimized /> : <span className="h-6 w-6 shrink-0 rounded-full bg-muted" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {t.seed ? <span className="mr-1 text-xs font-normal text-muted-foreground">{t.seed}</span> : null}
                    {t.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{gameLabel(p.gameId, regions)}</span>
                </span>
                <span className="text-right">
                  <span className={cn("block text-sm font-semibold tabular-nums", paid && "text-hit")}>{paid ? `+${p.points}` : `${p.points} pts`}</span>
                  <span className="block text-[11px] text-muted-foreground">only {p.pct}% of the pool</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
