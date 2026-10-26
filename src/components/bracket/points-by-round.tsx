import { cn } from "@/lib/utils";
import type { RoundSummary } from "@/lib/bracket-summary";

const SHORT: Record<number, string> = { 1: "R1", 2: "R2", 3: "S16", 4: "E8", 5: "F4", 6: "Champ" };

/**
 * One segment per round, sized by the round's points: earned (green), gone (red tint), still possible (track).
 * `tone="dark"` sits on the team-colored summary card.
 */
export function PointsByRound({ rounds, labels = false, tone = "light", className }: { rounds: RoundSummary[]; labels?: boolean; tone?: "light" | "dark"; className?: string }) {
  return (
    <div className={cn("flex gap-1", className)} role="img" aria-label={rounds.map((r) => `${SHORT[r.round]} ${r.earned} of ${r.max}`).join(", ")}>
      {rounds.map((r) => (
        <div key={r.round} className={labels ? "min-w-[40px]" : "min-w-0"} style={{ flexGrow: r.max, flexBasis: 0 }}>
          <div className={cn("flex h-2 overflow-hidden rounded-full", tone === "dark" ? "bg-frame-foreground/20" : "bg-muted")}>
            <div className="bg-emerald-500" style={{ width: `${(r.earned / r.max) * 100}%` }} />
            <div className={tone === "dark" ? "bg-miss/70" : "bg-miss/30"} style={{ width: `${(r.gone / r.max) * 100}%` }} />
          </div>
          {labels && (
            <p className={cn("mt-1 text-[10px] leading-tight", tone === "dark" ? "text-frame-foreground/80" : "text-muted-foreground")}>
              <span className={cn("block font-semibold", tone === "dark" ? "text-frame-foreground" : "text-foreground")}>{SHORT[r.round]}</span>
              <span className="block tabular-nums">
                {r.earned}/{r.max}
              </span>
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export function PointsLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground", className)}>
      {[
        ["bg-emerald-500", "earned"],
        ["bg-muted ring-1 ring-border", "still possible"],
        ["bg-miss/30", "gone"],
      ].map(([color, label]) => (
        <span key={label} className="flex items-center gap-1">
          <span className={cn("h-2 w-2 rounded-full", color)} /> {label}
        </span>
      ))}
    </div>
  );
}
