import Image from "next/image";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChoiceResult } from "@/lib/picker";
import type { PickerTeam } from "@/components/picker/game-picker";
import { RankBadge } from "@/components/game-center/parts";

const ROW: Record<ChoiceResult, string> = {
  won: "bg-hit-soft",
  lost: "bg-miss-soft",
  out: "",
  pending: "border bg-card",
};
const NAME: Record<ChoiceResult, string> = {
  won: "font-semibold text-hit",
  lost: "text-muted-foreground line-through",
  out: "text-muted-foreground/60 line-through",
  pending: "font-semibold",
};

interface PickRowProps {
  team: PickerTeam;
  state: ChoiceResult;
  /** Points this choice is worth */
  points: number;
  /** 1-based rank (multi-choice rounds); omit for 1-pick rounds */
  rank?: number;
  /** Share of the pool with the same pick at the same rank */
  pct?: number;
  /** Round 1 shows both teams; the one you didn't pick is muted */
  unpicked?: boolean;
}

/** One ranked choice in a game: right (green), wrong (red tint, struck), knocked out (faded), or still alive */
export function PickRow({ team, state, points, rank, pct, unpicked = false }: PickRowProps) {
  const meta = unpicked ? null : state === "won" ? `+${points}` : state === "pending" ? `${points} pts` : state === "out" ? "out" : "0";
  return (
    <div className={cn("flex min-h-10 items-center gap-2 rounded-lg px-3 py-1.5", unpicked ? "" : ROW[state])}>
      {rank ? <RankBadge rank={rank} size="md" /> : null}
      {team.logo ? (
        <Image src={team.logo} alt="" width={22} height={22} className={cn("h-[22px] w-[22px] shrink-0 object-contain", (unpicked || state === "out") && "opacity-40")} unoptimized />
      ) : (
        <span className="h-[22px] w-[22px] shrink-0 rounded-full bg-muted" />
      )}
      <span className="w-4 shrink-0 text-right text-[11px] text-muted-foreground">{team.seed || ""}</span>
      <span className={cn("min-w-0 flex-1 truncate text-sm", unpicked ? "text-muted-foreground" : NAME[state])}>{team.name}</span>
      {meta && <span className={cn("shrink-0 text-xs tabular-nums", state === "won" ? "font-semibold text-hit" : "text-muted-foreground")}>{meta}</span>}
      {pct != null && !unpicked && <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">{pct}%</span>}
      {state === "won" && !unpicked && <Check className="h-3.5 w-3.5 shrink-0 text-hit" strokeWidth={3} />}
    </div>
  );
}
