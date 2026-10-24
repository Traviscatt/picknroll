"use client";

import Link from "next/link";
import { Crown, Medal, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ordinal } from "@/components/game-center/parts";
import type { HallOfFameSeason } from "@/lib/hall-of-fame";

const MEDAL = { 2: "text-slate-400", 3: "text-amber-600" } as Record<number, string>;

/** Final podium for the season, plus where you finished */
export function SeasonRecap({
  year,
  season,
  you,
}: {
  year: number | null;
  season: HallOfFameSeason | null;
  you: { rank: number; score: number; total: number } | null;
}) {
  const champions = season?.podium.filter((p) => p.place === 1) ?? [];
  const rest = season?.podium.filter((p) => p.place > 1) ?? [];
  return (
    <section className="space-y-4 rounded-2xl bg-primary p-5 text-primary-foreground">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-team-secondary">{year ? `${year} season` : "Season"} · Final</p>
        {champions.length ? (
          champions.map((c) => (
            <div key={c.name} className="mt-1 flex items-center gap-3">
              <Trophy className="h-9 w-9 shrink-0 text-yellow-300" />
              <div className="min-w-0 flex-1">
                <p className="text-xs opacity-80">Champion</p>
                <p className="truncate text-2xl font-bold">{c.name}</p>
              </div>
              {c.score != null && <p className="text-2xl font-bold tabular-nums">{c.score}</p>}
            </div>
          ))
        ) : (
          <p className="mt-1 text-2xl font-bold">The championship is final</p>
        )}
      </div>
      {rest.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {rest.map((p) => (
            <div key={`${p.place}-${p.name}`} className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2">
              <Medal className={`h-4 w-4 shrink-0 ${MEDAL[p.place] ?? ""}`} />
              <span className="text-xs opacity-80">{ordinal(p.place)}</span>
              <span className="flex-1 truncate text-sm font-semibold">{p.name}</span>
              {p.score != null && <span className="text-sm tabular-nums">{p.score}</span>}
            </div>
          ))}
        </div>
      )}
      {you && (
        <p className="rounded-lg bg-white/10 px-3 py-2 text-sm">
          You finished <span className="font-bold">{ordinal(you.rank)}</span> of {you.total} with <span className="font-bold">{you.score} pts</span>.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="secondary" size="sm">
          <Link href="/hall-of-fame">
            <Crown className="mr-1.5 h-4 w-4" /> Hall of Fame
          </Link>
        </Button>
        <Button asChild size="sm" className="border border-white/35 bg-transparent hover:bg-white/10">
          <Link href="/leaderboard">Final standings</Link>
        </Button>
      </div>
      <p className="text-xs opacity-75">Next season opens after Selection Sunday, once the field is announced.</p>
    </section>
  );
}
