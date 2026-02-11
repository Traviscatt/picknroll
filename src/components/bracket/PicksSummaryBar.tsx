"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Team {
  id: string;
  name: string;
  seed: number;
  region: string;
  logo: string;
  record?: string;
}

interface PicksSummaryBarProps {
  picks: string[]; // Team IDs in order
  teams: Team[];
  maxChoices: number;
  pointsPerChoice: number[];
  onClear: () => void;
}

export function PicksSummaryBar({
  picks,
  teams,
  maxChoices,
  pointsPerChoice,
  onClear,
}: PicksSummaryBarProps) {
  if (maxChoices <= 1) return null;

  const getTeamById = (id: string) => teams.find((t) => t.id === id);

  return (
    <div className="mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-600">
          Your Picks ({picks.length}/{maxChoices})
        </span>
        {picks.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-slate-500 hover:text-red-500"
            onClick={onClear}
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: maxChoices }).map((_, index) => {
          const teamId = picks[index];
          const team = teamId ? getTeamById(teamId) : null;
          const points = pointsPerChoice[index];
          
          return (
            <div
              key={index}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs",
                team
                  ? index === 0
                    ? "bg-orange-100 text-orange-700 border border-orange-200"
                    : "bg-yellow-100 text-yellow-700 border border-yellow-200"
                  : "bg-white text-slate-400 border border-dashed border-slate-300"
              )}
            >
              <span className="font-bold">#{index + 1}</span>
              {team ? (
                <>
                  <span className="font-medium">{team.name}</span>
                  <span className="text-[10px] opacity-70">({points}pts)</span>
                </>
              ) : (
                <span className="italic">Pick #{index + 1}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
