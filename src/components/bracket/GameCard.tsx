"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamSlot } from "./TeamSlot";

interface Team {
  id: string;
  name: string;
  seed: number;
  region: string;
  logo: string;
  record?: string;
}

interface GameCardProps {
  gameNumber: number;
  round: number;
  region: string;
  eligibleTeams: Team[];
  picks: string[]; // Team IDs in order of preference
  maxChoices: number;
  pointsPerChoice: number[];
  onPick: (teamId: string, choiceRank: number) => void;
}

const ROUND_NAMES: Record<number, string> = {
  1: "First Round",
  2: "Second Round",
  3: "Sweet 16",
  4: "Elite 8",
  5: "Final Four",
  6: "Championship",
};

export function GameCard({
  gameNumber,
  round,
  region,
  eligibleTeams,
  picks,
  maxChoices,
  pointsPerChoice,
  onPick,
}: GameCardProps) {
  const currentChoiceCount = picks.length;

  const handleTeamClick = (teamId: string) => {
    const choiceIndex = picks.indexOf(teamId);
    if (choiceIndex !== -1) {
      // Remove this pick
      onPick(teamId, 0);
    } else if (currentChoiceCount < maxChoices) {
      // Add as next choice
      onPick(teamId, currentChoiceCount + 1);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3 bg-slate-50 border-b">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Game {gameNumber}</span>
          <span className="text-xs font-normal text-slate-500">
            {ROUND_NAMES[round]} · {region}
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4">
        {/* Multi-choice summary bar (display only, no clear button) */}
        {maxChoices > 1 && picks.length > 0 && (
          <div className="mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-xs font-medium text-slate-600">
              Your Picks ({picks.length}/{maxChoices})
            </span>
            <div className="flex flex-wrap gap-2 mt-2">
              {picks.map((teamId, index) => {
                const team = eligibleTeams.find((t) => t.id === teamId);
                return team ? (
                  <div
                    key={teamId}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs ${
                      index === 0
                        ? "bg-orange-100 text-orange-700 border border-orange-200"
                        : "bg-yellow-100 text-yellow-700 border border-yellow-200"
                    }`}
                  >
                    <span className="font-bold">#{index + 1}</span>
                    <span className="font-medium">{team.name}</span>
                    <span className="text-[10px] opacity-70">({pointsPerChoice[index]}pts)</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Team slots */}
        <div className="space-y-2">
          {eligibleTeams.map((team) => {
            const choiceIndex = picks.indexOf(team.id);
            const isSelected = choiceIndex !== -1;

            return (
              <TeamSlot
                key={team.id}
                team={team}
                isSelected={isSelected}
                choiceRank={choiceIndex}
                maxChoices={maxChoices}
                onSelect={() => handleTeamClick(team.id)}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
