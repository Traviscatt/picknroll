"use client";

import { cn } from "@/lib/utils";
import { getPickColor } from "@/lib/pick-colors";
import Image from "next/image";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";

interface Team {
  id: string;
  name: string;
  seed: number;
  region: string;
  logo: string;
  record?: string;
}

interface BracketSlotProps {
  gameId: string;
  round: number;
  eligibleTeams: Team[];
  picks: string[];
  maxChoices: number;
  pointsPerChoice: number[];
  onPick: (gameId: string, teamId: string, choiceRank: number) => void;
  mirrored?: boolean;
}

function TeamRow({
  team,
  isSelected,
  onClick,
  mirrored,
}: {
  team: Team;
  isSelected: boolean;
  onClick: () => void;
  mirrored?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-1 px-1.5 h-7 transition-all",
        mirrored ? "flex-row-reverse text-right" : "text-left",
        isSelected
          ? "bg-slate-800 text-white"
          : "hover:bg-slate-100 text-slate-900"
      )}
    >
      <Image
        src={team.logo}
        alt={team.name}
        width={14}
        height={14}
        className={cn("w-3.5 h-3.5 object-contain shrink-0", isSelected && "brightness-0 invert")}
        unoptimized
      />
      <span className={cn(
        "text-[10px] font-bold shrink-0",
        isSelected ? "text-white/60" : "text-slate-600"
      )}>
        {team.seed}
      </span>
      <span className="truncate text-[11px] font-semibold">
        {team.name}
      </span>
    </button>
  );
}

export function BracketSlot({
  gameId,
  round,
  eligibleTeams,
  picks,
  maxChoices,
  pointsPerChoice,
  onPick,
  mirrored = false,
}: BracketSlotProps) {
  const [open, setOpen] = useState(false);
  const firstPick = picks[0]
    ? eligibleTeams.find((t) => t.id === picks[0])
    : null;

  const handleSelect = (teamId: string) => {
    const choiceIndex = picks.indexOf(teamId);
    if (choiceIndex !== -1) {
      onPick(gameId, teamId, 0);
    } else if (picks.length < maxChoices) {
      onPick(gameId, teamId, picks.length + 1);
    } else if (maxChoices === 1) {
      onPick(gameId, teamId, 1);
    }
    if (maxChoices === 1) setOpen(false);
  };

  // Round 1: Show both teams as clickable rows (like a paper bracket)
  if (round === 1 && eligibleTeams.length === 2) {
    return (
      <div className={cn(
        "w-[130px] border-2 rounded overflow-hidden bg-white",
        picks.length > 0 ? "border-slate-700" : "border-slate-500"
      )}>
        <TeamRow
          team={eligibleTeams[0]}
          isSelected={picks[0] === eligibleTeams[0].id}
          onClick={() => handleSelect(eligibleTeams[0].id)}
          mirrored={mirrored}
        />
        <div className="border-t border-slate-400" />
        <TeamRow
          team={eligibleTeams[1]}
          isSelected={picks[0] === eligibleTeams[1].id}
          onClick={() => handleSelect(eligibleTeams[1].id)}
          mirrored={mirrored}
        />
      </div>
    );
  }

  // Empty slot (no eligible teams yet)
  if (eligibleTeams.length === 0) {
    return (
      <div className={cn(
        "h-7 w-[130px] border-2 border-dashed border-slate-500 rounded bg-slate-100 flex items-center justify-center",
        "text-[10px] text-slate-500 font-medium"
      )}>
        —
      </div>
    );
  }

  // Round 2+: single choice with popover
  if (maxChoices === 1) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "h-7 w-[130px] border-2 rounded flex items-center gap-1.5 px-1.5 text-left transition-all text-xs cursor-pointer",
              mirrored && "flex-row-reverse text-right",
              firstPick
                ? "border-emerald-500 bg-emerald-50"
                : "border-slate-500 bg-white hover:border-slate-700"
            )}
          >
            {firstPick ? (
              <>
                <Image
                  src={firstPick.logo}
                  alt={firstPick.name}
                  width={14}
                  height={14}
                  className="w-3.5 h-3.5 object-contain shrink-0"
                  unoptimized
                />
                <span className="text-[10px] text-slate-700 font-bold">{firstPick.seed}</span>
                <span className="font-semibold truncate text-[11px] text-slate-900">{firstPick.name}</span>
              </>
            ) : (
              <span className="text-slate-600 text-[10px] font-medium">Pick winner...</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[190px] p-1 border-2 border-slate-400" align={mirrored ? "end" : "start"}>
          <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
            {eligibleTeams.map((team) => (
              <button
                key={team.id}
                onClick={() => handleSelect(team.id)}
                className={cn(
                  "w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors",
                  picks[0] === team.id
                    ? "bg-slate-800 text-white font-semibold"
                    : "hover:bg-slate-100 text-slate-900"
                )}
              >
                <Image
                  src={team.logo}
                  alt={team.name}
                  width={16}
                  height={16}
                  className="w-4 h-4 object-contain shrink-0"
                  unoptimized
                />
                <span className={cn("font-bold text-[10px]", picks[0] === team.id ? "text-white/60" : "text-slate-600")}>{team.seed}</span>
                <span className="font-semibold truncate">{team.name}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Multi-choice rounds (S16, E8, FF, Championship)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "min-h-7 w-[130px] border-2 rounded flex flex-col px-1.5 py-0.5 text-left transition-all text-xs cursor-pointer",
            mirrored && "items-end text-right",
            picks.length > 0
              ? "border-slate-700 bg-white"
              : "border-slate-500 bg-white hover:border-slate-700"
          )}
        >
          {picks.length > 0 ? (
            picks.map((pickId, idx) => {
              const team = eligibleTeams.find((t) => t.id === pickId);
              if (!team) return null;
              return (
                <div key={pickId} className={cn("flex items-center gap-1 leading-tight", mirrored && "flex-row-reverse")}>
                  <span className={cn(
                    "text-[9px] font-bold w-3",
                    getPickColor(idx).dot
                  )}>
                    {idx + 1}.
                  </span>
                  <span className="truncate text-[10px] font-semibold text-slate-900">{team.name}</span>
                  <span className="text-[8px] text-slate-600 font-bold ml-auto">{pointsPerChoice[idx]}p</span>
                </div>
              );
            })
          ) : (
            <span className="text-slate-600 text-[10px] font-medium py-0.5">
              Rank {maxChoices}...
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[230px] p-2 border-2 border-slate-400" align={mirrored ? "end" : "start"}>
        <div className="text-[11px] text-slate-700 mb-1.5 font-bold">
          Rank {maxChoices} choices ({pointsPerChoice.join("/")} pts)
        </div>
        {picks.length > 0 && (
          <div className="mb-2 space-y-0.5 p-1.5 bg-slate-100 rounded border-2 border-slate-300">
            {picks.map((pickId, idx) => {
              const team = eligibleTeams.find((t) => t.id === pickId);
              if (!team) return null;
              return (
                <div key={pickId} className="flex items-center gap-1 text-[11px]">
                  <span className={cn(
                    "font-bold w-4",
                    getPickColor(idx).dot
                  )}>
                    #{idx + 1}
                  </span>
                  <span className="truncate font-semibold text-slate-900">{team.name}</span>
                  <span className="text-slate-600 font-bold ml-auto">{pointsPerChoice[idx]}pts</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(team.id);
                    }}
                    className="text-red-500 hover:text-red-700 ml-1 text-[11px] font-bold"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
          {eligibleTeams
            .filter((t) => !picks.includes(t.id))
            .map((team) => (
              <button
                key={team.id}
                onClick={() => handleSelect(team.id)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-xs hover:bg-slate-100 transition-colors"
              >
                <Image
                  src={team.logo}
                  alt={team.name}
                  width={16}
                  height={16}
                  className="w-4 h-4 object-contain shrink-0"
                  unoptimized
                />
                <span className="font-bold text-[10px] text-slate-700">{team.seed}</span>
                <span className="font-semibold truncate text-slate-900">{team.name}</span>
              </button>
            ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
