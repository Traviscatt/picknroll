"use client";

import { Medal, Trophy } from "lucide-react";
import { ordinal } from "@/components/game-center/parts";
import { Panel } from "@/components/shared/panel";
import type { HallOfFameSeason } from "@/lib/hall-of-fame";

const MEDAL = { 1: "text-yellow-500", 2: "text-slate-400", 3: "text-amber-600" } as Record<number, string>;

/** A season's podium (Hall of Fame data) */
export function PodiumPanel({ season, title }: { season: HallOfFameSeason; title?: string }) {
  return (
    <Panel
      title={title ?? `${season.year} podium`}
      count={season.entries ? `${season.entries} entries` : undefined}
      footer={{ label: "Hall of Fame", href: "/hall-of-fame", note: season.poolName ?? undefined }}
    >
      <div className="divide-y border-t">
        {season.podium.map((p) => (
          <div key={`${p.place}-${p.name}`} className="flex items-center gap-3 px-4 py-2.5">
            {p.place === 1 ? <Trophy className={`h-4 w-4 shrink-0 ${MEDAL[1]}`} /> : <Medal className={`h-4 w-4 shrink-0 ${MEDAL[p.place] ?? "text-muted-foreground"}`} />}
            <span className="w-8 shrink-0 text-xs text-muted-foreground">{ordinal(p.place)}</span>
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-sm ${p.place === 1 ? "font-bold" : "font-semibold"}`}>{p.name}</span>
              {(p.bracketName || p.note) && <span className="block truncate text-[11px] text-muted-foreground">{p.bracketName ?? p.note}</span>}
            </span>
            {p.score != null && <span className="shrink-0 font-bold tabular-nums">{p.score}</span>}
          </div>
        ))}
        {!season.podium.length && <p className="px-4 py-4 text-sm text-muted-foreground">No results recorded for this season.</p>}
      </div>
    </Panel>
  );
}
