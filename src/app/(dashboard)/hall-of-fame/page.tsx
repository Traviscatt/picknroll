"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Crown, Medal, Trophy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import type { HallOfFameLeader, HallOfFameSeason } from "@/lib/hall-of-fame";

const PLACE_STYLE: Record<number, { label: string; ring: string; text: string }> = {
  1: { label: "Champion", ring: "border-yellow-400 bg-yellow-50", text: "text-yellow-700" },
  2: { label: "2nd", ring: "border-slate-300 bg-slate-50", text: "text-slate-600" },
  3: { label: "3rd", ring: "border-orange-300 bg-orange-50", text: "text-orange-700" },
};

export default function HallOfFamePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<{ seasons: HallOfFameSeason[]; leaders: HallOfFameLeader[] } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/hall-of-fame")
      .then((res) => (res.ok ? res.json() : { seasons: [], leaders: [] }))
      .then(setData)
      .catch(() => setData({ seasons: [], leaders: [] }));
  }, [session]);

  if (status === "loading" || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  const champions = data.leaders.filter((l) => l.titles > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Crown className="h-7 w-7 text-yellow-500" /> Hall of Fame
          </span>
        }
        description="Every season's champion and podium."
      />

      {data.seasons.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">The first champion is crowned when this season&apos;s final ends.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            {data.seasons.map((season) => {
              const champ = season.podium.filter((p) => p.place === 1);
              const rest = season.podium.filter((p) => p.place > 1);
              return (
                <Card key={`${season.year}-${season.poolName ?? ""}`} className="overflow-hidden">
                  <div className="flex items-center justify-between bg-frame px-5 py-2.5 text-frame-foreground">
                    <span className="text-lg font-bold">{season.year}</span>
                    <span className="text-xs opacity-80">
                      {[season.poolName, season.entries ? `${season.entries} entries` : null].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  <CardContent className="space-y-3 p-5">
                    {champ.map((p) => (
                      <div key={p.name} className={cn("flex items-center gap-4 rounded-xl border-2 p-4", PLACE_STYLE[1].ring)}>
                        <Trophy className="h-9 w-9 shrink-0 text-yellow-500" />
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-xs font-semibold uppercase tracking-wide", PLACE_STYLE[1].text)}>Champion</p>
                          <p className="truncate text-xl font-bold">{p.name}</p>
                          {(p.bracketName || p.note) && <p className="truncate text-xs text-muted-foreground">{p.bracketName ?? p.note}</p>}
                        </div>
                        {p.score != null && (
                          <div className="text-right">
                            <p className="text-2xl font-bold tabular-nums">{p.score}</p>
                            <p className="text-[10px] text-muted-foreground">pts</p>
                          </div>
                        )}
                      </div>
                    ))}
                    {rest.length > 0 && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {rest.map((p) => (
                          <div key={`${p.place}-${p.name}`} className={cn("flex items-center gap-3 rounded-lg border p-3", PLACE_STYLE[p.place]?.ring)}>
                            <Medal className={cn("h-5 w-5 shrink-0", PLACE_STYLE[p.place]?.text)} />
                            <div className="min-w-0 flex-1">
                              <p className={cn("text-[11px] font-semibold", PLACE_STYLE[p.place]?.text)}>{PLACE_STYLE[p.place]?.label}</p>
                              <p className="truncate font-semibold">{p.name}</p>
                            </div>
                            {p.score != null && <span className="font-semibold tabular-nums">{p.score}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>All-time champions</CardTitle>
              <CardDescription>Titles, then podium finishes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {champions.map((l, i) => (
                <div key={l.name} className="flex items-center gap-3">
                  <span className="w-5 text-right text-sm font-semibold text-muted-foreground">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{l.name}</p>
                    <p className="text-xs text-muted-foreground">{l.years.sort((a, b) => b - a).join(", ")}</p>
                  </div>
                  <span className="flex items-center gap-1 text-sm font-bold">
                    <Trophy className="h-4 w-4 text-yellow-500" /> {l.titles}
                  </span>
                  <span className="w-14 text-right text-xs text-muted-foreground">{l.podiums} podium{l.podiums === 1 ? "" : "s"}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
