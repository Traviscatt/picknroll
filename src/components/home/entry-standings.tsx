"use client";

import Image from "next/image";
import Link from "next/link";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SeasonEntry } from "@/lib/season";
import type { FieldLookup } from "@/lib/tournament-field";
import { ordinal } from "@/components/game-center/parts";
import { Panel } from "@/components/shared/panel";

/** Your entries once picks lock: rank, points, max, and whether the champion pick is still alive */
export function EntryStandings({ entries, lookup, poolEntries }: { entries: SeasonEntry[]; lookup: FieldLookup; poolEntries: number }) {
  const scored = entries.filter((e) => e.summary);
  if (!scored.length) return null;
  return (
    <Panel title="Your entries" count={scored.length} footer={{ label: "My Brackets", href: "/brackets" }}>
      <div className="divide-y border-t">
        {scored.map((entry) => {
          const summary = entry.summary!;
          const champ = summary.champion;
          const champOut = champ && (champ.state === "out" || champ.state === "lost");
          return (
            <Link key={entry.id} href={`/brackets/${entry.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50">
              <span className="w-9 shrink-0 text-sm font-bold">{entry.rank ? ordinal(entry.rank) : "–"}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{entry.name}</span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  {champ ? (
                    <>
                      <Crown className="h-3 w-3 text-amber-600" />
                      {lookup.logo(champ.team) && (
                        <Image src={lookup.logo(champ.team)!} alt="" width={12} height={12} className={cn("h-3 w-3 object-contain", champOut && "opacity-40")} unoptimized />
                      )}
                      <span className={cn("truncate", champOut && "line-through")}>{lookup.name(champ.team)}</span>
                      {champ.state === "won" && <span className="font-semibold text-hit">won it all</span>}
                    </>
                  ) : (
                    `of ${poolEntries}`
                  )}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-bold tabular-nums text-primary">{summary.score}</span>
                <span className="block text-[10px] text-muted-foreground">max {summary.max}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </Panel>
  );
}
