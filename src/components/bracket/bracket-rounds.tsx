"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPickColor } from "@/lib/pick-colors";
import { SCORING_RULES } from "@/lib/scoring";
import { choiceResult, choicesFor, eligibleTeams, pointsFor, type GameSlot, type Picks } from "@/lib/picker";
import type { PickerTeam } from "@/components/picker/game-picker";
import type { BracketResults } from "./DesktopBracketView";

const FINAL_TAB = "Final Four";
const roundName = (round: number) => SCORING_RULES.find((r) => r.round === round)?.roundName ?? `Round ${round}`;

interface BracketRoundsProps {
  regions: string[];
  games: GameSlot[];
  picks: Picks;
  team: (id: string) => PickerTeam;
  results: BracketResults;
  tiebreaker: number | null;
}

/** Read-only bracket for phones and tablets: one region at a time, round by round */
export function BracketRounds({ regions, games, picks, team, results, tiebreaker }: BracketRoundsProps) {
  const [tab, setTab] = useState(regions[0] ?? FINAL_TAB);
  const tabs = [...regions, FINAL_TAB];
  const inTab = games.filter((g) => (tab === FINAL_TAB ? g.region === null : g.region === tab));
  const rounds = [...new Set(inTab.map((g) => g.round))];

  return (
    <div className="space-y-4">
      <div className="sticky top-14 z-30 -mx-4 flex gap-2 overflow-x-auto bg-background/95 px-4 py-2 backdrop-blur md:top-16">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium",
              t === tab ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
            )}
          >
            {t === FINAL_TAB && <Crown className="h-3.5 w-3.5" />}
            {t}
          </button>
        ))}
      </div>

      {rounds.map((round) => (
        <section key={round} className="space-y-2">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {roundName(round)}
            <span className="rounded-full border px-1.5 py-px text-[10px] font-semibold normal-case tracking-normal">{pointsFor(round).join(" / ")} pts</span>
          </h3>
          <div className={cn("grid gap-2", round <= 2 ? "grid-cols-2 sm:grid-cols-4" : round <= 4 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
            {inTab
              .filter((g) => g.round === round)
              .map((game) => (
                <GameCard key={game.gameId} game={game} picks={picks} team={team} results={results} regions={regions} />
              ))}
          </div>
        </section>
      ))}

      {tab === FINAL_TAB && tiebreaker != null && (
        <p className="rounded-lg border bg-card px-3 py-2 text-sm">
          <span className="text-muted-foreground">Tiebreaker (championship total):</span> <span className="font-bold">{tiebreaker}</span>
        </p>
      )}
    </div>
  );
}

function GameCard({ game, picks, team, results, regions }: { game: GameSlot; picks: Picks; team: (id: string) => PickerTeam; results: BracketResults; regions: string[] }) {
  const choices = picks.get(game.gameId)?.choices ?? [];
  const winner = results.winners.get(game.gameId) ?? null;
  const multi = choicesFor(game.round) > 1;
  const points = pointsFor(game.round);
  const rows = game.round === 1 ? eligibleTeams(game, picks) : choices;
  const label =
    game.round === 5 ? `${regions[(game.number - 1) * 2]} vs ${regions[(game.number - 1) * 2 + 1]}` : game.round === 6 ? "Championship" : `Game ${game.number}`;

  return (
    <div className={cn("rounded-lg border bg-card p-2", winner && "border-foreground/40")}>
      <p className="mb-1 text-[10px] font-semibold text-muted-foreground">{label}</p>
      {rows.length === 0 && <p className="text-xs text-muted-foreground">No pick</p>}
      {rows.map((teamId, i) => {
        const t = team(teamId);
        const picked = game.round === 1 ? choices[0] === teamId : true;
        const index = game.round === 1 ? 0 : i;
        const result = picked ? choiceResult(teamId, winner, results.eliminated) : "pending";
        const share = picked ? results.pct?.[game.gameId]?.[`${index}:${teamId}`] : undefined;
        return (
          <div key={teamId} className={cn("flex items-center gap-1.5 rounded px-1 py-0.5", game.round === 1 && picked && "bg-muted")}>
            {multi ? (
              <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white", getPickColor(i).badge)}>{i + 1}</span>
            ) : t.logo ? (
              <Image src={t.logo} alt="" width={16} height={16} className={cn("h-4 w-4 shrink-0 object-contain", (!picked || result === "out") && "opacity-40")} unoptimized />
            ) : (
              <span className="h-4 w-4 shrink-0" />
            )}
            <span className="w-4 shrink-0 text-right text-[10px] text-muted-foreground">{t.seed || ""}</span>
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-xs",
                !picked && "text-muted-foreground",
                picked && "font-semibold",
                result === "won" && "text-emerald-700",
                result === "lost" && "text-muted-foreground line-through",
                result === "out" && "text-muted-foreground/60"
              )}
            >
              {t.name}
            </span>
            {result === "won" && <Check className="h-3 w-3 shrink-0 text-emerald-600" strokeWidth={3} />}
            {share != null && <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">{share}%</span>}
            {multi && <span className="w-5 shrink-0 text-right text-[10px] font-semibold text-muted-foreground tabular-nums">{points[i]}</span>}
          </div>
        );
      })}
    </div>
  );
}
