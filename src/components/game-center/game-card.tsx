"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { getPickColor } from "@/lib/pick-colors";
import { SCORING_RULES } from "@/lib/scoring";
import { leaderSlot, pickVerdict, ROUND_LABELS, type LiveGame, type Rooting } from "@/lib/live";
import type { FieldLookup } from "@/lib/tournament-field";
import { PoolSplit } from "./pool-split";
import { RankBadge, StatusPill, VerdictChip } from "./parts";

interface GameCardProps {
  game: LiveGame;
  /** The selected bracket's ranked choices for this game */
  choices: string[] | null;
  lookup: FieldLookup;
  rooting: Rooting | null;
  currentRank: number | null;
  favoriteEspnId: string | null;
  highlight?: boolean;
  /** Start with the pool breakdown and "If X wins" expanded (game sheet) */
  poolSplitOpen?: boolean;
}

export function GameCard({ game, choices, lookup, rooting, currentRank, favoriteEspnId, highlight, poolSplitOpen = false }: GameCardProps) {
  const leader = leaderSlot(game);
  const verdict = choices ? pickVerdict(choices, game) : null;
  const rule = SCORING_RULES.find((r) => r.round === game.round);
  const playing = game.teams.map((t) => t.slot);
  const yourTeam = favoriteEspnId ? game.teams.find((t) => t.espnId === favoriteEspnId) : undefined;
  const meta = [game.region, ROUND_LABELS[game.round]].filter(Boolean).join(" · ");

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card shadow-sm", highlight && "border-primary ring-1 ring-primary")}>
      {yourTeam && (
        <div className="bg-frame px-4 py-1 text-[11px] font-semibold uppercase tracking-wide text-frame-foreground">Your team: {yourTeam.name}</div>
      )}
      <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-1">
        <StatusPill game={game} />
        <span className="truncate text-xs text-muted-foreground">
          {meta}
          {game.state !== "pre" && game.network ? ` · ${game.network}` : ""}
        </span>
      </div>

      <div className="space-y-2 px-4 pt-1 pb-3">
        {game.teams.map((team) => {
          const strong = leader === team.slot && !!leader;
          const weak = !!leader && leader !== team.slot;
          return (
            <div key={team.espnId || team.name} className="flex items-center gap-2.5">
              <span className="w-4 text-right text-xs text-muted-foreground">{team.seed ?? ""}</span>
              {team.logo ? (
                <Image src={team.logo} alt="" width={24} height={24} className="h-6 w-6 object-contain" unoptimized />
              ) : (
                <span className="h-6 w-6 rounded-full bg-muted" />
              )}
              <span className={cn("flex-1 truncate text-[15px]", strong ? "font-bold" : "font-medium", weak && "text-muted-foreground")}>{team.name}</span>
              {team.score != null && (
                <span className={cn("text-[17px] tabular-nums", strong ? "font-bold" : "font-medium", weak && "text-muted-foreground")}>{team.score}</span>
              )}
            </div>
          );
        })}
      </div>

      {choices && verdict && rule && (
        <div className="space-y-2 border-t bg-secondary/60 px-4 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Your picks</span>
            <VerdictChip verdict={verdict} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {choices.slice(0, rule.choices).map((teamId, i) => {
              const out = playing.every(Boolean) && !playing.includes(teamId);
              const color = getPickColor(i);
              return (
                <span
                  key={teamId}
                  className={cn("inline-flex items-center gap-1.5 rounded-full border bg-card py-0.5 pr-2.5 pl-0.5 text-xs", color.border, out && "opacity-50")}
                >
                  {rule.choices > 1 ? <RankBadge rank={i + 1} size="md" /> : <span className={cn("h-5 w-1.5 rounded-full", color.badge)} />}
                  <span className={cn("font-semibold", out && "line-through")}>{lookup.name(teamId)}</span>
                  <span className="text-[10px] text-muted-foreground">{out ? "out" : `${rule.pointsPerChoice[i]} pts`}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      <PoolSplit game={game} rooting={rooting} currentRank={currentRank} defaultOpen={poolSplitOpen} />
    </div>
  );
}
