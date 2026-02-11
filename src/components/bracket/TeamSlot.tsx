"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

interface Team {
  id: string;
  name: string;
  seed: number;
  region: string;
  logo: string;
  record?: string; // e.g., "28-5"
}

interface TeamSlotProps {
  team: Team;
  isSelected: boolean;
  choiceRank?: number; // 0-indexed, -1 if not selected
  maxChoices: number;
  disabled?: boolean;
  onSelect: () => void;
}

export function TeamSlot({
  team,
  isSelected,
  choiceRank = -1,
  maxChoices,
  disabled = false,
  onSelect,
}: TeamSlotProps) {
  const isFirstChoice = choiceRank === 0;

  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all",
        "active:scale-[0.98] touch-manipulation",
        isSelected
          ? isFirstChoice
            ? "border-orange-500 bg-orange-50"
            : "border-yellow-500 bg-yellow-50"
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
            isSelected
              ? isFirstChoice
                ? "bg-orange-500 text-white"
                : "bg-yellow-500 text-white"
              : "bg-slate-100 text-slate-600"
          )}
        >
          {team.seed}
        </span>
        {team.logo && (
          <Image
            src={team.logo}
            alt={team.name}
            width={24}
            height={24}
            className="w-6 h-6 object-contain shrink-0"
            unoptimized
          />
        )}
        <span className="font-medium text-left">{team.name}</span>
        {team.record && (
          <span className="text-xs text-slate-500 ml-1">({team.record})</span>
        )}
      </div>
      
      {isSelected ? (
        <Badge 
          className={cn(
            "shrink-0",
            isFirstChoice ? "bg-orange-500" : "bg-yellow-500"
          )}
        >
          {maxChoices === 1 ? "✓" : `#${choiceRank + 1}`}
        </Badge>
      ) : (
        maxChoices > 1 && (
          <span className="text-xs text-slate-400 shrink-0">Tap to add</span>
        )
      )}
    </button>
  );
}
