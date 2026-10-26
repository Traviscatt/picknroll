"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Target } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Comparison, TeamStatus } from "@/lib/bracket-summary";
import type { PickerTeam } from "@/components/picker/game-picker";
import { RankBadge, ordinal } from "@/components/game-center/parts";
import { gameLabel, roundPoints } from "./labels";
import type { SheetGame } from "./game-sheet";

interface Side {
  rank: number | null;
  score: number;
  max: number;
  champion: TeamStatus | null;
}

type CompareResponse = Comparison & {
  role: "leader" | "runner-up";
  me: Side;
  opponent: Side & { bracketId: string; name: string; bracketName: string };
};

/** This bracket vs. the pool leader (or the runner-up when it leads): only the games that can still swing */
export function CompareLeader({ bracketId, regions, team, eliminated, onOpenGame }: { bracketId: string; regions: string[]; team: (id: string) => PickerTeam; eliminated: Set<string>; onOpenGame?: (game: SheetGame) => void }) {
  const [data, setData] = useState<CompareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/brackets/${bracketId}/compare`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!active) return;
        if (res.ok) setData(body);
        else setError(body.error || "Couldn't load the comparison");
      })
      .catch(() => active && setError("Couldn't load the comparison"));
    return () => {
      active = false;
    };
  }, [bracketId]);

  if (error) return <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">{error}</p>;
  if (!data) return <div className="h-64 animate-pulse rounded-xl bg-muted" />;

  const { me, opponent, diffs, upside, matchedDecided, decided, role } = data;
  const first = opponent.name.split(" ")[0];
  const gap = opponent.score - me.score;
  const callout =
    role === "runner-up"
      ? `You lead ${first} by ${-gap}. ${diffs.length} game${diffs.length === 1 ? "" : "s"} left where your picks differ.`
      : `${gap} behind with ${diffs.length} game${diffs.length === 1 ? "" : "s"} left where your picks differ, worth up to +${upside} for you.`;

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          {[
            ["You", me],
            [opponent.name, opponent],
          ].map(([label, side]) => {
            const s = side as Side;
            return (
              <div key={label as string} className="min-w-0 space-y-1">
                <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {label as string} · {s.rank ? ordinal(s.rank) : "–"}
                </p>
                <p className="flex items-baseline gap-1.5">
                  <span className={cn("text-2xl font-bold tabular-nums", label === "You" && "text-primary")}>{s.score}</span>
                  <span className="text-xs text-muted-foreground">pts · max {s.max}</span>
                </p>
                {s.champion && <TeamChip team={team(s.champion.team)} out={s.champion.state === "out" || s.champion.state === "lost"} />}
              </div>
            );
          })}
        </div>
        <p className="flex items-start gap-2 rounded-lg bg-secondary px-3 py-2 text-sm">
          <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {callout}
        </p>
        <Link href={`/brackets/${opponent.bracketId}`} className="block text-xs font-semibold text-primary">
          See {first}&apos;s bracket →
        </Link>
      </section>

      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">Where you differ</h2>
        <span className="text-xs text-muted-foreground">biggest swing first</span>
      </div>
      {diffs.length === 0 && <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">No games left where your brackets can score differently.</p>}
      <div className="grid gap-3 lg:grid-cols-2">
        {diffs.map((d) => {
          const pts = roundPoints(d.round);
          const side = (choices: string[]) => {
            const top = choices.find((t) => !eliminated.has(t)) ?? choices[0];
            const i = choices.indexOf(top);
            return top ? { team: top, rank: i + 1, points: pts[i] ?? 0, multi: pts.length > 1 } : null;
          };
          const [mine, theirs] = [side(d.mine), side(d.theirs)];
          return (
            <button
              type="button"
              key={d.gameId}
              onClick={() => onOpenGame?.({ gameId: d.gameId, round: d.round })}
              className="block w-full space-y-2.5 rounded-xl border bg-card p-3 text-left shadow-sm transition-colors hover:border-foreground/30"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{gameLabel(d.gameId, regions)}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", d.gain > 0 ? "bg-hit-soft text-hit" : "bg-muted text-muted-foreground")}>
                  {d.gain > 0 ? `+${d.gain}` : d.gain} pt swing
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["You", mine, "bg-secondary"],
                  [first, theirs, "bg-muted"],
                ].map(([who, s, bg]) => {
                  const pick = s as ReturnType<typeof side>;
                  return (
                    <div key={who as string} className={cn("flex min-w-0 items-center gap-2 rounded-lg px-2 py-2", bg as string)}>
                      {pick?.multi && <RankBadge rank={pick.rank} size="md" />}
                      {pick && <Logo team={team(pick.team)} out={eliminated.has(pick.team)} />}
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{pick ? team(pick.team).name : "No pick"}</span>
                        <span className="block text-[10px] text-muted-foreground">
                          {who as string} · {pick?.points ?? 0} pts
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="truncate text-xs">
                {d.rootFor ? (
                  <span className="font-semibold text-hit">Root for {team(d.rootFor).name}</span>
                ) : (
                  <span className="font-semibold text-miss">Root against {team(d.rootAgainst!).name}</span>
                )}
                <span className="text-muted-foreground">
                  {" "}
                  · {d.rootFor ? "" : "if they win, "}you +{d.myPoints}, {first} +{d.theirPoints}
                </span>
              </p>
            </button>
          );
        })}
      </div>
      {decided > 0 && (
        <p className="text-xs text-muted-foreground">
          Finished games: you scored the same as {first} in {matchedDecided} of {decided}.
        </p>
      )}
    </div>
  );
}

function Logo({ team, out }: { team: PickerTeam; out?: boolean }) {
  return team.logo ? (
    <Image src={team.logo} alt="" width={20} height={20} className={cn("h-5 w-5 shrink-0 object-contain", out && "opacity-40")} unoptimized />
  ) : (
    <span className="h-5 w-5 shrink-0 rounded-full bg-muted" />
  );
}

function TeamChip({ team, out }: { team: PickerTeam; out?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-sm font-semibold">
      <Logo team={team} out={out} />
      <span className={cn("truncate", out && "line-through opacity-60")}>{team.name}</span>
    </span>
  );
}
