"use client";

import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { GameCard } from "@/components/game-center/game-card";
import { ROUND_LABELS, personalSummary, type LiveGame, type LivePayload } from "@/lib/live";
import { choiceResult, choicesFor, pointsFor } from "@/lib/picker";
import type { FieldLookup } from "@/lib/tournament-field";
import type { PickerTeam } from "@/components/picker/game-picker";
import type { BracketResults } from "./DesktopBracketView";
import { gameLabel } from "./labels";
import { PickRow } from "./pick-row";

export interface SheetGame {
  gameId: string;
  round: number;
}

const fetchLive = async (poolId: string, date?: string): Promise<LivePayload | null> => {
  const res = await fetch(`/api/live?poolId=${encodeURIComponent(poolId)}${date ? `&date=${date}` : ""}`).catch(() => null);
  return res?.ok ? res.json() : null;
};

/** The live (or final) ESPN game for a bracket game: today's payload first, then that round's days */
function useGameLive(poolId: string | null, game: SheetGame | null) {
  const [found, setFound] = useState<{ key: string; payload: LivePayload | null; live: LiveGame | null } | null>(null);
  const key = `${poolId}:${game?.gameId}`;
  useEffect(() => {
    if (!poolId || !game) return;
    let active = true;
    (async () => {
      const first = await fetchLive(poolId);
      let payload = first;
      let live = first?.games.find((g) => g.gameId === game.gameId) ?? null;
      if (first && !live) {
        const days = first.days.filter((d) => d.round === ROUND_LABELS[game.round] && d.date !== first.date);
        for (const p of await Promise.all(days.map((d) => fetchLive(poolId, d.date)))) {
          const g = p?.games.find((x) => x.gameId === game.gameId);
          if (p && g) {
            payload = p;
            live = g;
            break;
          }
        }
      }
      if (active) setFound({ key, payload, live });
    })();
    return () => {
      active = false;
    };
  }, [poolId, game, key]);
  const current = found?.key === key ? found : null;
  return { payload: current?.payload ?? null, live: current?.live ?? null, loading: !!game && !current };
}

interface GameSheetProps {
  game: SheetGame | null;
  onClose: () => void;
  poolId: string | null;
  bracketId: string;
  choicesByGame: Map<string, string[]>;
  regions: string[];
  team: (id: string) => PickerTeam;
  lookup: FieldLookup;
  results: BracketResults;
}

/**
 * Tap a game: live or final score, your picks, how the pool split, and what each result means for your rank.
 * Bottom sheet on phones, side panel on desktop.
 */
export function GameSheet({ game, onClose, poolId, bracketId, choicesByGame, regions, team, lookup, results }: GameSheetProps) {
  const mobile = useIsMobile();
  const { payload, live, loading } = useGameLive(poolId, game);
  const summary = useMemo(() => (payload ? personalSummary(payload, bracketId, choicesByGame) : null), [payload, bracketId, choicesByGame]);
  const choices = game ? choicesByGame.get(game.gameId) ?? [] : [];
  const points = game ? pointsFor(game.round) : [];
  const multi = game ? choicesFor(game.round) > 1 : false;
  const winner = game ? results.winners.get(game.gameId) ?? null : null;

  return (
    <Sheet open={!!game} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side={mobile ? "bottom" : "right"} className={mobile ? "max-h-[85vh] overflow-y-auto rounded-t-2xl pb-[calc(1rem+env(safe-area-inset-bottom))]" : "w-full overflow-y-auto sm:max-w-md"}>
        {game && (
          <>
            <SheetHeader className="pb-0 text-left">
              <SheetTitle>{gameLabel(game.gameId, regions)}</SheetTitle>
              <SheetDescription>
                {points.join(" / ")} pts{multi ? " by rank" : ""}
                {winner ? ` · Won by ${team(winner).name}` : ""}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 px-4 pb-4">
              {loading ? (
                <div className="h-40 animate-pulse rounded-xl bg-muted" />
              ) : live ? (
                <GameCard
                  game={live}
                  choices={choices.length ? choices : null}
                  lookup={lookup}
                  rooting={summary?.rootings.get(game.gameId) ?? null}
                  currentRank={summary?.entry?.liveRank ?? null}
                  favoriteEspnId={null}
                  poolSplitOpen
                />
              ) : (
                <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                  {winner ? "Final." : "This matchup isn't set yet."} Live scores and what each result means show up here on game day.
                </p>
              )}
              {!live && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Your picks</p>
                  {choices.length === 0 && <p className="text-sm text-muted-foreground">No pick for this game.</p>}
                  {choices.map((teamId, i) => (
                    <PickRow
                      key={teamId}
                      team={team(teamId)}
                      state={choiceResult(teamId, winner, results.eliminated)}
                      points={points[i] ?? 0}
                      rank={multi ? i + 1 : undefined}
                      pct={results.pct?.[game.gameId]?.[`${i}:${teamId}`]}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
