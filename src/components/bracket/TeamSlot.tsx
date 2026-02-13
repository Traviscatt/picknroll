"use client";

import { cn } from "@/lib/utils";
import { getPickColor } from "@/lib/pick-colors";
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
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all",
        "active:scale-[0.98] touch-manipulation",
        isSelected
          ? `${getPickColor(choiceRank).border} ${getPickColor(choiceRank).bg}`
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
            isSelected
              ? `${getPickColor(choiceRank).badge} text-white`
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
          <span className="text-xs text-muted-foreground ml-1">({team.record})</span>
        )}
      </div>
      
      {isSelected ? (
        <Badge 
          className={cn(
            "shrink-0",
            getPickColor(choiceRank).badge
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
