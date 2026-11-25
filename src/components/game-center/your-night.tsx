"use client";

import { ArrowDown, ArrowUp, Target, Trophy } from "lucide-react";
import type { StandingEntry } from "@/lib/live";
import { Hero, HeroAction } from "@/components/shared/hero";
import { ordinal } from "./parts";

interface YourNightProps {
  entry: StandingEntry;
  title: string;
  anyLive: boolean;
  alive: { alive: number; total: number };
  biggestSwing: number;
  onRooting: () => void;
  onLiveStandings: () => void;
  /** Extra content above the buttons (e.g. the entry switcher) */
  children?: React.ReactNode;
}

/** Your position tonight. Team-themed card (frame), numbers from the shared payload. */
export function YourNight({ entry, title, anyLive, alive, biggestSwing, onRooting, onLiveStandings, children }: YourNightProps) {
  const move = entry.officialRank - entry.liveRank;
  const tonight = entry.live - entry.official;
  return (
    <Hero
      label={`Your night · ${title}`}
      value={ordinal(anyLive ? entry.liveRank : entry.officialRank)}
      caption={anyLive ? "if games ended now" : "in the standings"}
      badge={
        anyLive &&
        move !== 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold">
            {move > 0 ? <ArrowUp className="h-3 w-3" strokeWidth={2.5} /> : <ArrowDown className="h-3 w-3" strokeWidth={2.5} />}
            {Math.abs(move)} from {ordinal(entry.officialRank)} official
          </span>
        )
      }
      side={{
        value: anyLive ? entry.live : entry.official,
        caption: anyLive ? "live pts" : "pts",
        extra: anyLive && (
          <p className="text-xs font-semibold text-frame-accent">
            {entry.official} official · {tonight >= 0 ? "+" : ""}
            {tonight}
          </p>
        ),
      }}
      stats={[
        { value: alive.total ? `${alive.alive} of ${alive.total}` : "–", label: "picks alive today" },
        { value: String(entry.max), label: "max possible" },
        { value: biggestSwing ? `${biggestSwing} spot${biggestSwing === 1 ? "" : "s"}` : "–", label: "biggest swing" },
      ]}
      actions={
        <>
          <HeroAction onClick={onRooting}>
            <Target className="h-4 w-4" /> Rooting guide
          </HeroAction>
          <HeroAction href="/leaderboard" onClick={onLiveStandings} variant="outline">
            <Trophy className="h-4 w-4" /> Standings
          </HeroAction>
        </>
      }
    >
      {children}
    </Hero>
  );
}
