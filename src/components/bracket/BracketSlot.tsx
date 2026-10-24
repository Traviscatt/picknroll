"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPickColor } from "@/lib/pick-colors";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { choiceResult, choicesFor, pointsFor, type ChoiceResult, type GameSlot, type Picks, type TapResult } from "@/lib/picker";
import { GamePicker, type PickerTeam } from "@/components/picker/game-picker";

interface BracketSlotProps {
  game: GameSlot;
  eligible: PickerTeam[];
  choices: string[];
  unlocked: boolean;
  team: (id: string) => PickerTeam;
  onTap: (teamId: string) => { result: TapResult; picks: Picks };
  onReorder: (order: string[]) => void;
  mirrored?: boolean;
}

function TeamRow({ team, picked, onClick, mirrored }: { team: PickerTeam; picked: boolean; onClick: () => void; mirrored?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={picked}
      className={cn(
        "flex h-7 w-full items-center gap-1 px-1.5 transition-colors",
        mirrored ? "flex-row-reverse text-right" : "text-left",
        picked ? "bg-emerald-50 text-emerald-900" : "text-foreground hover:bg-muted"
      )}
    >
      {team.logo && <Image src={team.logo} alt="" width={14} height={14} className="h-3.5 w-3.5 shrink-0 object-contain" unoptimized />}
      <span className="shrink-0 text-[10px] font-bold text-muted-foreground">{team.seed}</span>
      <span className="truncate text-[11px] font-semibold">{team.name}</span>
      {picked && <span className={cn("h-3.5 w-1 shrink-0 rounded-full bg-emerald-500", mirrored ? "mr-auto" : "ml-auto")} />}
    </button>
  );
}

const RESULT_TEXT: Record<ChoiceResult, string> = {
  won: "text-emerald-700",
  lost: "text-muted-foreground line-through",
  out: "text-muted-foreground/60",
  pending: "text-foreground",
};

interface BracketResultSlotProps {
  game: GameSlot;
  /** Round 1: both teams; later rounds: ignored (the choices are shown) */
  eligible: PickerTeam[];
  choices: string[];
  team: (id: string) => PickerTeam;
  winner: string | null;
  eliminated: Set<string>;
  /** Share of the pool with the same pick at the same rank, keyed "rank index:teamId" */
  pct?: Record<string, number>;
  mirrored?: boolean;
}

/** One game in a read-only bracket: the picks, marked right, wrong, or knocked out */
export function BracketResultSlot({ game, eligible, choices, team, winner, eliminated, pct, mirrored = false }: BracketResultSlotProps) {
  const max = choicesFor(game.round);
  const points = pointsFor(game.round);
  const rows = game.round === 1 ? eligible : choices.map(team);
  return (
    <div className={cn("flex w-[130px] flex-col overflow-hidden rounded border-2 bg-card", winner ? "border-foreground/60" : "border-border", game.round === 1 && "justify-center")}>
      {rows.length === 0 && <span className="flex h-6 items-center justify-center text-[10px] text-muted-foreground">No pick</span>}
      {rows.map((t, i) => {
        const picked = game.round === 1 ? choices[0] === t.id : true;
        const index = game.round === 1 ? 0 : i;
        const result = picked ? choiceResult(t.id, winner, eliminated) : "pending";
        const share = picked ? pct?.[`${index}:${t.id}`] : undefined;
        return (
          <div
            key={t.id}
            title={share != null ? `${share}% of the pool made this pick` : undefined}
            className={cn(
              "flex w-full items-center gap-1 px-1.5 leading-tight",
              game.round === 1 ? "h-7" : "py-0.5",
              game.round === 1 && i > 0 && "border-t",
              game.round === 1 && picked && "bg-muted",
              mirrored && "flex-row-reverse text-right"
            )}
          >
            {max > 1 ? (
              <span className={cn("flex h-3 w-3 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white", getPickColor(i).badge)}>{i + 1}</span>
            ) : (
              t.logo && <Image src={t.logo} alt="" width={14} height={14} className={cn("h-3.5 w-3.5 shrink-0 object-contain", (!picked || result === "out") && "opacity-40")} unoptimized />
            )}
            {game.round === 1 && <span className="shrink-0 text-[10px] font-bold text-muted-foreground">{t.seed}</span>}
            <span className={cn("truncate text-[10px]", picked ? "font-semibold" : "font-medium text-muted-foreground", picked && RESULT_TEXT[result])}>{t.name}</span>
            <span className={cn("flex shrink-0 items-center gap-0.5 text-[8px] font-bold text-muted-foreground", mirrored ? "mr-auto" : "ml-auto")}>
              {picked && result === "won" && <Check className="h-2.5 w-2.5 text-emerald-600" strokeWidth={3} />}
              {max > 1 && points[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** One game in the desktop bracket tree. Round 1 picks inline; later rounds open a tap-to-rank popover. */
export function BracketSlot({ game, eligible, choices, unlocked, team, onTap, onReorder, mirrored = false }: BracketSlotProps) {
  const [open, setOpen] = useState(false);
  const max = choicesFor(game.round);
  const points = pointsFor(game.round);

  if (game.round === 1) {
    return (
      <div className={cn("w-[130px] overflow-hidden rounded border-2 bg-card", choices.length ? "border-foreground/70" : "border-foreground/30")}>
        {eligible.map((t, i) => (
          <div key={t.id} className={cn(i > 0 && "border-t border-border")}>
            <TeamRow team={t} picked={choices[0] === t.id} onClick={() => onTap(t.id)} mirrored={mirrored} />
          </div>
        ))}
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="flex h-7 w-[130px] items-center justify-center gap-1 rounded border-2 border-dashed border-border bg-muted/50 text-[10px] font-medium text-muted-foreground">
        <Lock className="h-3 w-3" /> {max > 1 ? `Rank ${max}` : "Winner"}
      </div>
    );
  }

  // Close the popover once a pick completes the game (first fill); stay open while editing a finished game
  const handleTap = (teamId: string) => {
    const wasComplete = choices.length >= max;
    const { result, picks } = onTap(teamId);
    const nowComplete = (picks.get(game.gameId)?.choices.length ?? 0) >= max;
    if (max === 1 ? result !== "removed" : !wasComplete && nowComplete) setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex min-h-7 w-[130px] cursor-pointer flex-col justify-center rounded border-2 bg-card px-1.5 py-0.5 text-left transition-colors",
            mirrored && "items-end text-right",
            choices.length >= max ? "border-foreground/70" : choices.length ? "border-amber-400" : "border-foreground/30 hover:border-foreground/70"
          )}
        >
          {choices.length ? (
            choices.map((id, i) => {
              const t = team(id);
              return (
                <span key={id} className={cn("flex w-full items-center gap-1 leading-tight", mirrored && "flex-row-reverse")}>
                  {max > 1 ? (
                    <span className={cn("flex h-3 w-3 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white", getPickColor(i).badge)}>{i + 1}</span>
                  ) : (
                    t.logo && <Image src={t.logo} alt="" width={14} height={14} className="h-3.5 w-3.5 shrink-0 object-contain" unoptimized />
                  )}
                  <span className="truncate text-[10px] font-semibold text-foreground">{t.name}</span>
                  {max > 1 && <span className={cn("text-[8px] font-bold text-muted-foreground", mirrored ? "mr-auto" : "ml-auto")}>{points[i]}</span>}
                </span>
              );
            })
          ) : (
            <span className="text-[10px] font-medium text-muted-foreground">{max > 1 ? `Rank ${max}…` : "Pick winner…"}</span>
          )}
          {max > 1 && choices.length > 0 && choices.length < max && <span className="text-[9px] text-amber-600">{max - choices.length} more</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-3" align={mirrored ? "end" : "start"}>
        <p className="mb-2 text-xs font-semibold text-muted-foreground">
          {max > 1 ? `Rank ${max} · ${points.join("/")} pts · drag to reorder` : `Pick the winner · ${points[0]} pts`}
        </p>
        <div className="max-h-[420px] overflow-y-auto pr-1">
          <GamePicker round={game.round} eligible={eligible} choices={choices} onTap={handleTap} onReorder={onReorder} size="sm" />
        </div>
      </PopoverContent>
    </Popover>
  );
}
