"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LiveGame, Rooting } from "@/lib/live";
import { ordinal } from "./parts";

const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);
const RANK_BAR = ["bg-emerald-500", "bg-amber-500", "bg-blue-500", "bg-purple-500", "bg-rose-500"];

/** Collapsed: share of the pool with each team 1st. Expanded: full rank breakdown and what each result means for you. */
export function PoolSplit({ game, rooting, currentRank }: { game: LiveGame; rooting: Rooting | null; currentRank: number | null }) {
  const [open, setOpen] = useState(false);
  const split = game.poolSplit;
  if (!split || split.total === 0) return null;
  const [a, b] = game.teams;
  const first = [split.counts[0][0], split.counts[1][0]];

  return (
    <div className="border-t px-4 py-3">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 text-left" aria-expanded={open}>
        <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className={cn("flex-1", open ? "text-sm font-semibold" : "text-xs text-muted-foreground")}>
          {open ? "How the pool ranked this game" : `Pool: ${pct(first[0], split.total)}% ${a.name} 1st · ${pct(first[1], split.total)}% ${b.name} 1st`}
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {!open && (
        <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="bg-primary" style={{ width: `${pct(first[0], split.total)}%` }} />
          <div className="bg-team-secondary" style={{ width: `${pct(first[1], split.total)}%` }} />
        </div>
      )}

      {open && (
        <div className="mt-3 space-y-3">
          {game.teams.map((team, t) => {
            const counts = split.counts[t];
            const notRanked = counts[counts.length - 1];
            return (
              <div key={team.espnId} className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs">
                  {team.logo && <Image src={team.logo} alt="" width={14} height={14} className="h-3.5 w-3.5 object-contain" unoptimized />}
                  <span className="flex-1 font-semibold">{team.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {counts
                      .slice(0, -1)
                      .map((n, r) => `${pct(n, split.total)}% ${ordinal(r + 1)}`)
                      .join(" · ")}
                    {` · ${pct(notRanked, split.total)}% not ranked`}
                  </span>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                  {counts.slice(0, -1).map((n, r) => (
                    <div key={r} className={RANK_BAR[r]} style={{ width: `${pct(n, split.total)}%` }} />
                  ))}
                </div>
              </div>
            );
          })}
          <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
            {split.counts[0].slice(0, -1).map((_, r) => (
              <span key={r} className="flex items-center gap-1">
                <span className={cn("h-2 w-2 rounded-sm", RANK_BAR[r])} />
                {ordinal(r + 1)}
              </span>
            ))}
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-muted" />
              not ranked
            </span>
          </div>

          {rooting && (
            <div className="grid grid-cols-2 gap-2">
              {rooting.options.map((option, t) => {
                const team = game.teams.find((x) => x.slot === option.team) ?? game.teams[t];
                const vsField = option.points - option.poolAvg;
                const move = currentRank != null ? currentRank - option.rank : 0;
                return (
                  <div key={option.team} className={cn("rounded-lg border p-2.5", t === rooting.recommended && rooting.swing > 0 && "border-emerald-300 bg-emerald-50/50")}>
                    <p className="truncate text-xs font-semibold">If {team.name} wins</p>
                    <div className="mt-1.5 grid grid-cols-3 gap-1 text-center">
                      <Stat value={`+${option.points}`} label="you" />
                      <Stat value={`+${option.poolAvg.toFixed(1)}`} label="pool avg" muted />
                      <Stat value={`${vsField >= 0 ? "+" : "−"}${Math.abs(vsField).toFixed(1)}`} label="vs field" tone={vsField >= 0 ? "up" : "down"} />
                    </div>
                    <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium">
                      {move > 0 ? <ArrowUp className="h-3 w-3 text-green-600" /> : move < 0 ? <ArrowDown className="h-3 w-3 text-red-600" /> : null}
                      Live rank → {ordinal(option.rank)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ value, label, muted, tone }: { value: string; label: string; muted?: boolean; tone?: "up" | "down" }) {
  return (
    <div>
      <p className={cn("text-sm font-bold", muted && "text-muted-foreground", tone === "up" && "text-green-600", tone === "down" && "text-red-600")}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
