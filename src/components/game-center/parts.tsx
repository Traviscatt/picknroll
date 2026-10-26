"use client";

import { ArrowDown, ArrowUp, Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPickColor } from "@/lib/pick-colors";
import type { LiveGame, Verdict } from "@/lib/live";

// Fixed status colors (never team-themed): red is reserved for LIVE, yellow for halftime.

export function StatusPill({ game }: { game: LiveGame }) {
  if (game.state === "in") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-red-600">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" />
        Live · {game.detail}
      </span>
    );
  }
  if (game.state === "half") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-yellow-700">
        <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
        Halftime
      </span>
    );
  }
  if (game.state === "post") {
    return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Final</span>;
  }
  const time = new Date(game.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return (
    <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200">
      {time}
      {game.network ? ` · ${game.network}` : ""}
    </span>
  );
}

export function RankBadge({ rank, size = "sm" }: { rank: number; size?: "sm" | "md" }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white",
        getPickColor(rank - 1).badge,
        size === "sm" ? "h-4 w-4 text-[10px]" : "h-5 w-5 text-[11px]"
      )}
    >
      {rank}
    </span>
  );
}

/** Result chip in neutral ink: solid = earned, outlined = provisional, gray = nothing */
export function VerdictChip({ verdict }: { verdict: Verdict }) {
  const styles = {
    earned: "bg-foreground text-background",
    holds: "border border-foreground text-foreground bg-card",
    now: "border border-foreground text-foreground bg-card",
    pending: "border border-border text-muted-foreground bg-card",
    zero: "bg-muted text-muted-foreground",
  }[verdict.tone];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", styles)}>
      {verdict.tone === "earned" && <Check className="h-3 w-3" strokeWidth={3} />}
      {verdict.rank && <RankBadge rank={verdict.rank} />}
      {verdict.label}
    </span>
  );
}

export function Movement({ by }: { by: number }) {
  if (by === 0) return <Minus className="h-3 w-3 text-slate-300" />;
  const up = by > 0;
  return (
    <span className={cn("inline-flex items-center text-[11px] font-semibold", up ? "text-green-600" : "text-red-600")}>
      {up ? <ArrowUp className="h-3 w-3" strokeWidth={2.5} /> : <ArrowDown className="h-3 w-3" strokeWidth={2.5} />}
      {Math.abs(by)}
    </span>
  );
}

export function StandingsToggle({
  mode,
  onChange,
  liveAvailable,
  className,
}: {
  mode: "official" | "live";
  onChange: (mode: "official" | "live") => void;
  liveAvailable: boolean;
  className?: string;
}) {
  const option = (value: "official" | "live", label: React.ReactNode) => (
    <button
      type="button"
      onClick={() => onChange(value)}
      disabled={value === "live" && !liveAvailable && mode !== "live"}
      title={value === "live" && !liveAvailable ? "No games in progress" : undefined}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        mode === value ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
  return (
    <div className={cn("flex gap-1 rounded-lg bg-muted p-1", className)} role="tablist" aria-label="Standings mode">
      {option("official", "Official")}
      {option(
        "live",
        <>
          <span className={cn("h-1.5 w-1.5 rounded-full", liveAvailable ? "bg-red-600" : "bg-slate-300")} />
          Live
        </>
      )}
    </div>
  );
}

export const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
