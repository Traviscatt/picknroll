"use client";

import { cn } from "@/lib/utils";
import { Panel } from "@/components/shared/panel";
import type { StandingEntry } from "@/lib/live";
import type { StandingsMode } from "@/hooks/use-standings-mode";
import { Movement, StandingsToggle } from "./parts";

/** Top of the standings plus your entries, Official or Live */
export function StandingsPanel({
  standings,
  mode,
  onModeChange,
  anyLive,
  myBracketIds,
  limit = 5,
}: {
  standings: StandingEntry[];
  mode: StandingsMode;
  onModeChange: (mode: StandingsMode) => void;
  anyLive: boolean;
  myBracketIds: string[];
  limit?: number;
}) {
  const live = mode === "live";
  const sorted = [...standings].sort((a, b) => (live ? a.liveRank - b.liveRank : a.officialRank - b.officialRank) || a.name.localeCompare(b.name));
  const top = sorted.slice(0, limit);
  const mine = sorted.filter((s, i) => i >= limit && myBracketIds.includes(s.bracketId));

  const row = (s: StandingEntry) => {
    const me = myBracketIds.includes(s.bracketId);
    const delta = s.live - s.official;
    return (
      <div key={s.bracketId} className={cn("flex items-center gap-2.5 px-4 py-2", me && "bg-secondary")}>
        <span className="w-5 text-right text-sm font-semibold text-muted-foreground">{live ? s.liveRank : s.officialRank}</span>
        {live && (
          <span className="w-7">
            <Movement by={s.officialRank - s.liveRank} />
          </span>
        )}
        <span className={cn("flex-1 truncate text-sm", me ? "font-bold" : "font-medium")}>{s.name}</span>
        {me && <span className="rounded border border-primary px-1.5 text-[10px] font-semibold text-primary">You</span>}
        {live && delta > 0 && <span className="text-xs font-semibold text-green-600">+{delta}</span>}
        <span className="w-9 text-right font-bold tabular-nums text-primary">{live ? s.live : s.official}</span>
      </div>
    );
  };

  return (
    <Panel
      title="Standings"
      aside={<StandingsToggle mode={mode} onChange={onModeChange} liveAvailable={anyLive} className="w-44" />}
      footer={{ label: "Full standings", href: "/leaderboard", note: live ? "Live = if every game ended now" : "Final results only" }}
    >
      {top.map(row)}
      {mine.length > 0 && <div className="px-4 text-center text-xs text-muted-foreground">⋯</div>}
      {mine.map(row)}
    </Panel>
  );
}
