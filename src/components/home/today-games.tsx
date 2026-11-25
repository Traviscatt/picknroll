"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { isLive, leaderSlot, pickVerdict, type LiveGame, type LivePayload } from "@/lib/live";
import { StatusPill, VerdictChip } from "@/components/game-center/parts";
import { Panel } from "@/components/shared/panel";

const byStart = (a: LiveGame, b: LiveGame) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
const plural = (n: number) => `${n} game${n === 1 ? "" : "s"}`;

/** The day's games grouped like Game Center: Live now, Up next, Final (compact rows) */
export function TodayGames({ data, picksByGame, limit = 4 }: { data: LivePayload; picksByGame: Map<string, string[]>; limit?: number }) {
  const day = data.days.find((d) => d.date === data.date);
  const upNext = data.date === data.today ? "Up next" : `Up next · ${day?.label ?? ""}`;
  const groups: [string, LiveGame[], boolean][] = (
    [
      ["Live now", data.games.filter(isLive), true],
      [upNext, data.games.filter((g) => g.state === "pre"), false],
      ["Final", data.games.filter((g) => g.state === "post"), false],
    ] as [string, LiveGame[], boolean][]
  ).filter(([, list]) => list.length > 0);

  if (!groups.length) {
    return (
      <Panel title="Games" footer={{ label: "Game Center", href: "/game-center" }}>
        <p className="border-t px-4 py-6 text-center text-sm text-muted-foreground">No games scheduled.</p>
      </Panel>
    );
  }

  return (
    <>
      {groups.map(([label, list, live], i) => {
        const shown = [...list].sort(byStart).slice(0, limit);
        const more = list.length - shown.length;
        return (
          <Panel
            key={label}
            title={label}
            live={live}
            count={plural(list.length)}
            aside={
              i === 0 && (
                <Link href="/game-center" className="shrink-0 text-sm font-semibold text-primary">
                  Game Center →
                </Link>
              )
            }
            footer={more > 0 ? { label: `${more} more`, href: "/game-center" } : undefined}
          >
            <div className="divide-y border-t">
              {shown.map((game) => (
                <GameRow key={game.espnId} game={game} choices={game.gameId ? picksByGame.get(game.gameId) : undefined} />
              ))}
            </div>
          </Panel>
        );
      })}
    </>
  );
}

function GameRow({ game, choices }: { game: LiveGame; choices: string[] | undefined }) {
  const leader = leaderSlot(game);
  const verdict = choices ? pickVerdict(choices, game) : null;
  return (
    <Link href="/game-center" className="block px-4 py-2.5 hover:bg-muted/50">
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
}
