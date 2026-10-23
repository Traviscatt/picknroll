"use client";

import Image from "next/image";
import { ArrowDown, ArrowUp, Check, Info, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { SCORING_RULES } from "@/lib/scoring";
import { ordinal, StatusPill } from "./parts";
import { ROUND_LABELS, type LiveGame, type Rooting } from "@/lib/live";

export interface RootingItem {
  game: LiveGame;
  rooting: Rooting;
  choices: string[] | null;
}

const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

/** Plain-language reason: your ranked choices for the game and how the pool ranked the two teams */
function why({ game, rooting, choices }: RootingItem): string {
  const rule = SCORING_RULES.find((r) => r.round === game.round);
  const name = (slot: string) => game.teams.find((t) => t.slot === slot)?.name ?? slot;
  const parts: string[] = [];
  const mine = (choices ?? []).slice(0, rule?.choices ?? 1);
  const yours = game.teams
    .map((t) => ({ t, rank: t.slot ? mine.indexOf(t.slot) : -1 }))
    .filter((x) => x.rank >= 0)
    .map(({ t, rank }) => `${t.name} ${ordinal(rank + 1)} (${rule?.pointsPerChoice[rank]})`);
  parts.push(yours.length ? `You have ${yours.join(" and ")}.` : "Neither team is in your picks for this game.");
  const split = game.poolSplit;
  if (split?.total) {
    const fav = split.counts[0][0] >= split.counts[1][0] ? 0 : 1;
    parts.push(`${pct(split.counts[fav][0], split.total)}% of the pool has ${game.teams[fav].name} 1st.`);
  }
  const [a] = rooting.options;
  if (rooting.swing === 0) parts.push(`Either way you stay ${ordinal(a.rank)}.`);
  else parts.push(`${name(rooting.options[rooting.recommended].team)} winning is worth ${rooting.swing} spot${rooting.swing === 1 ? "" : "s"} to you.`);
  return parts.join(" ");
}

export function RootingGuide({
  items,
  currentRank,
  range,
  compact,
}: {
  items: RootingItem[];
  currentRank: number | null;
  range: { best: { rank: number; points: number }; worst: { rank: number; points: number } } | null;
  compact?: boolean;
}) {
  const sorted = [...items].sort((x, y) => y.rooting.swing - x.rooting.swing || new Date(x.game.startTime).getTime() - new Date(y.game.startTime).getTime());

  if (compact) {
    return (
      <div className="divide-y">
        {sorted.slice(0, 3).map(({ game, rooting }) => {
          const pickOption = rooting.options[rooting.recommended];
          const team = game.teams.find((t) => t.slot === pickOption.team)!;
          const other = game.teams.find((t) => t.slot !== pickOption.team)!;
          return (
            <div key={game.espnId} className="flex items-center gap-3 px-4 py-2.5">
              {team.logo && <Image src={team.logo} alt="" width={28} height={28} className="h-7 w-7 object-contain" unoptimized />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {team.name} over {other.name}
                </p>
                <p className="text-[11px] text-muted-foreground">{rooting.swing ? `Swing: ${rooting.swing} spot${rooting.swing === 1 ? "" : "s"}` : "Low stakes"}</p>
              </div>
              <span className="text-xs font-semibold text-green-600">+{pickOption.points}</span>
            </div>
          );
        })}
        {!sorted.length && <p className="px-4 py-3 text-sm text-muted-foreground">No undecided games on this day.</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {range && currentRank != null && (
        <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Today&apos;s range</h3>
            <span className="text-xs text-muted-foreground">{items.length} game{items.length === 1 ? "" : "s"} left · estimate</span>
          </div>
          <div className="flex items-end justify-between text-center">
            <RangeStat label={`worst · ${range.worst.points} pts`} value={ordinal(range.worst.rank)} tone="text-red-600" />
            <RangeStat label="now (live)" value={ordinal(currentRank)} tone="text-primary" />
            <RangeStat label={`best · ${range.best.points} pts`} value={ordinal(range.best.rank)} tone="text-green-600" />
          </div>
        </div>
      )}

      {sorted.map((item) => {
        const { game, rooting } = item;
        const best = rooting.options[rooting.recommended];
        const team = game.teams.find((t) => t.slot === best.team)!;
        const other = game.teams.find((t) => t.slot !== best.team)!;
        return (
          <div key={game.espnId} className={cn("overflow-hidden rounded-xl border bg-card shadow-sm", rooting.swing >= 4 && "border-primary")}>
            <div className="flex items-center justify-between px-4 pt-3">
              <StatusPill game={game} />
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                  rooting.swing >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                <Zap className="h-3 w-3" />
                {rooting.swing ? `Swing: ${rooting.swing} spot${rooting.swing === 1 ? "" : "s"}` : "Low stakes"}
              </span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              {team.logo && <Image src={team.logo} alt="" width={36} height={36} className="h-9 w-9 object-contain" unoptimized />}
              <div>
                <p className="text-lg font-semibold">Root for {team.name}</p>
                <p className="text-xs text-muted-foreground">
                  over ({other.seed}) {other.name} · {[game.region, ROUND_LABELS[game.round]].filter(Boolean).join(" ")}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 px-4 pb-3">
              {rooting.options.map((option, t) => {
                const optTeam = game.teams.find((x) => x.slot === option.team)!;
                const move = currentRank != null ? currentRank - option.rank : 0;
                const recommended = t === rooting.recommended;
                return (
                  <div key={option.team} className={cn("space-y-1 rounded-lg p-3", recommended ? "border border-emerald-300 bg-emerald-50" : "bg-muted")}>
                    <p className="flex items-center gap-1.5 text-xs font-semibold">
                      {optTeam.logo && <Image src={optTeam.logo} alt="" width={16} height={16} className="h-4 w-4 object-contain" unoptimized />}
                      <span className="truncate">{optTeam.name} wins</span>
                      {recommended && rooting.swing > 0 && <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={3} />}
                    </p>
                    <p className={cn("text-xl font-bold", recommended && "text-emerald-700")}>
                      +{option.points} <span className="text-[10px] font-normal text-muted-foreground">pts</span>
                    </p>
                    <p className="flex items-center gap-1 text-sm font-semibold">
                      {move > 0 ? <ArrowUp className="h-3 w-3 text-green-600" /> : move < 0 ? <ArrowDown className="h-3 w-3 text-red-600" /> : null}
                      {ordinal(option.rank)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">pool avg +{option.poolAvg.toFixed(1)}</p>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 border-t bg-secondary/60 px-4 py-2.5 text-xs">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <p>{why(item)}</p>
            </div>
          </div>
        );
      })}
      {!sorted.length && <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">No undecided games on this day.</p>}
    </div>
  );
}

function RangeStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div>
      <p className={cn("text-lg font-bold", tone)}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
