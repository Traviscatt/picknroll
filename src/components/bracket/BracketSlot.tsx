"use client";

import { useState } from "react";
import Image from "next/image";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPickColor } from "@/lib/pick-colors";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { choicesFor, pointsFor, type GameSlot, type Picks, type TapResult } from "@/lib/picker";
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
        picked ? "bg-emerald-50 text-emerald-900" : "text-slate-900 hover:bg-slate-100"
      )}
    >
      {team.logo && <Image src={team.logo} alt="" width={14} height={14} className="h-3.5 w-3.5 shrink-0 object-contain" unoptimized />}
      <span className="shrink-0 text-[10px] font-bold text-slate-500">{team.seed}</span>
      <span className="truncate text-[11px] font-semibold">{team.name}</span>
      {picked && <span className={cn("h-3.5 w-1 shrink-0 rounded-full bg-emerald-500", mirrored ? "mr-auto" : "ml-auto")} />}
    </button>
  );
}

/** One game in the desktop bracket tree. Round 1 picks inline; later rounds open a tap-to-rank popover. */
export function BracketSlot({ game, eligible, choices, unlocked, team, onTap, onReorder, mirrored = false }: BracketSlotProps) {
  const [open, setOpen] = useState(false);
  const max = choicesFor(game.round);
  const points = pointsFor(game.round);

  if (game.round === 1) {
    return (
      <div className={cn("w-[130px] overflow-hidden rounded border-2 bg-white", choices.length ? "border-slate-700" : "border-slate-400")}>
        {eligible.map((t, i) => (
          <div key={t.id} className={cn(i > 0 && "border-t border-slate-300")}>
            <TeamRow team={t} picked={choices[0] === t.id} onClick={() => onTap(t.id)} mirrored={mirrored} />
          </div>
        ))}
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="flex h-7 w-[130px] items-center justify-center gap-1 rounded border-2 border-dashed border-slate-300 bg-slate-50 text-[10px] font-medium text-slate-400">
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
            "flex min-h-7 w-[130px] cursor-pointer flex-col justify-center rounded border-2 bg-white px-1.5 py-0.5 text-left transition-colors",
            mirrored && "items-end text-right",
            choices.length >= max ? "border-slate-700" : choices.length ? "border-amber-400" : "border-slate-400 hover:border-slate-700"
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
                  <span className="truncate text-[10px] font-semibold text-slate-900">{t.name}</span>
                  {max > 1 && <span className={cn("text-[8px] font-bold text-slate-500", mirrored ? "mr-auto" : "ml-auto")}>{points[i]}</span>}
                </span>
              );
            })
          ) : (
            <span className="text-[10px] font-medium text-slate-500">{max > 1 ? `Rank ${max}…` : "Pick winner…"}</span>
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
