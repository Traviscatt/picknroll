"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { isLive, leaderSlot, pickVerdict, type LiveGame, type LivePayload } from "@/lib/live";
import { StatusPill, VerdictChip } from "@/components/game-center/parts";

const ORDER = (g: LiveGame) => (isLive(g) ? 0 : g.state === "pre" ? 1 : 2);

/** The day's games in a compact list: live first, then upcoming, then final */
export function TodayGames({ data, picksByGame, limit = 6 }: { data: LivePayload; picksByGame: Map<string, string[]>; limit?: number }) {
  const games = [...data.games].sort((a, b) => ORDER(a) - ORDER(b) || new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const day = data.days.find((d) => d.date === data.date);
  const title = data.date === data.today ? "Today" : day ? `Next up · ${day.label}` : "Games";

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            {data.anyLive && <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />}
            {title}
          </h2>
          {day && <p className="text-xs text-muted-foreground">{day.round}</p>}
        </div>
        <Link href="/game-center" className="flex items-center text-sm font-semibold text-primary">
          Game Center <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      {games.length === 0 ? (
        <p className="border-t px-4 py-6 text-center text-sm text-muted-foreground">No games scheduled.</p>
      ) : (
        <div className="divide-y border-t">
          {games.slice(0, limit).map((game) => {
            const leader = leaderSlot(game);
            const choices = game.gameId ? picksByGame.get(game.gameId) : undefined;
            const verdict = choices ? pickVerdict(choices, game) : null;
            return (
              <Link key={game.espnId} href="/game-center" className="block px-4 py-2.5 hover:bg-muted/50">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <StatusPill game={game} />
                  {verdict && <VerdictChip verdict={verdict} />}
                </div>
                {game.teams.map((team) => (
                  <div key={team.espnId || team.name} className="flex items-center gap-2 py-0.5">
                    <span className="w-4 text-right text-[11px] text-muted-foreground">{team.seed ?? ""}</span>
                    {team.logo ? (
                      <Image src={team.logo} alt="" width={18} height={18} className="h-[18px] w-[18px] object-contain" unoptimized />
                    ) : (
                      <span className="h-[18px] w-[18px] rounded-full bg-muted" />
                    )}
                    <span className={cn("flex-1 truncate text-sm", leader === team.slot ? "font-bold" : "font-medium", leader && leader !== team.slot && "text-muted-foreground")}>
                      {team.name}
                    </span>
                    {team.score != null && <span className={cn("text-sm tabular-nums", leader === team.slot ? "font-bold" : "text-muted-foreground")}>{team.score}</span>}
                  </div>
                ))}
              </Link>
            );
          })}
          {games.length > limit && (
            <Link href="/game-center" className="block px-4 py-2.5 text-center text-xs font-semibold text-primary">
              {games.length - limit} more game{games.length - limit === 1 ? "" : "s"} →
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
