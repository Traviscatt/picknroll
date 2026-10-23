"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, Target, Trophy } from "lucide-react";
import type { StandingEntry } from "@/lib/live";
import { ordinal } from "./parts";

interface YourNightProps {
  entry: StandingEntry;
  title: string;
  anyLive: boolean;
  alive: { alive: number; total: number };
  biggestSwing: number;
  onRooting: () => void;
  onLiveStandings: () => void;
}

/** Your position tonight. Team-themed card (frame), numbers from the shared payload. */
export function YourNight({ entry, title, anyLive, alive, biggestSwing, onRooting, onLiveStandings }: YourNightProps) {
  const move = entry.officialRank - entry.liveRank;
  const tonight = entry.live - entry.official;
  return (
    <div className="space-y-3.5 rounded-2xl bg-primary p-4 text-primary-foreground">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-team-secondary">Your night · {title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight">{ordinal(anyLive ? entry.liveRank : entry.officialRank)}</span>
            <span className="text-xs opacity-75">{anyLive ? "if games ended now" : "in the standings"}</span>
          </div>
          {anyLive && move !== 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold">
              {move > 0 ? <ArrowUp className="h-3 w-3" strokeWidth={2.5} /> : <ArrowDown className="h-3 w-3" strokeWidth={2.5} />}
              {Math.abs(move)} from {ordinal(entry.officialRank)} official
            </span>
          )}
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold tabular-nums">{anyLive ? entry.live : entry.official}</p>
          <p className="text-[10px] opacity-75">{anyLive ? "live pts" : "pts"}</p>
          {anyLive && (
            <p className="text-xs font-semibold text-team-secondary">
              {entry.official} official · {tonight >= 0 ? "+" : ""}
              {tonight}
            </p>
          )}
        </div>
      </div>
      <div className="h-px bg-white/15" />
      <div className="flex justify-between gap-2">
        <Stat value={alive.total ? `${alive.alive} of ${alive.total}` : "–"} label="picks alive today" />
        <Stat value={String(entry.max)} label="max possible" />
        <Stat value={biggestSwing ? `${biggestSwing} spot${biggestSwing === 1 ? "" : "s"}` : "–"} label="biggest swing" />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onRooting} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-card px-3 py-2 text-sm font-semibold text-primary">
          <Target className="h-4 w-4" /> Rooting guide
        </button>
        <Link
          href="/leaderboard"
          onClick={onLiveStandings}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/35 px-3 py-2 text-sm font-semibold"
        >
          <Trophy className="h-4 w-4" /> Standings
        </Link>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-semibold">{value}</p>
      <p className="text-[10px] opacity-70">{label}</p>
    </div>
  );
}
