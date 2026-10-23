"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Reorder } from "framer-motion";
import { Check, GripVertical, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPickColor } from "@/lib/pick-colors";
import { choicesFor, pointsFor } from "@/lib/picker";

export interface PickerTeam {
  id: string;
  name: string;
  seed: number;
  logo: string | null;
  record: string | null;
}

interface GamePickerProps {
  round: number;
  eligible: PickerTeam[];
  choices: string[];
  onTap: (teamId: string) => void;
  onReorder?: (order: string[]) => void;
  /** Team IDs to mark as "Your Round 1 pick" (Round 2 cards) */
  roundOneWinners?: string[];
  size?: "md" | "sm";
}

function TeamFace({ team, size }: { team: PickerTeam; size: "md" | "sm" }) {
  return (
    <>
      <span className="w-5 shrink-0 text-right text-xs text-muted-foreground">{team.seed}</span>
      {team.logo ? (
        <Image src={team.logo} alt="" width={28} height={28} className={cn("shrink-0 object-contain", size === "md" ? "h-7 w-7" : "h-5 w-5")} unoptimized />
      ) : (
        <span className={cn("shrink-0 rounded-full bg-muted", size === "md" ? "h-7 w-7" : "h-5 w-5")} />
      )}
      <span className="min-w-0 flex-1 truncate text-left">
        <span className={cn("font-semibold", size === "md" ? "text-[15px]" : "text-sm")}>{team.name}</span>
        {team.record && size === "md" && <span className="ml-1.5 text-xs text-muted-foreground">{team.record}</span>}
      </span>
    </>
  );
}

/** Pick a winner (Rounds 1–2) or rank teams (Sweet 16 on). Tap order = rank; drag to reorder. */
export function GamePicker({ round, eligible, choices, onTap, onReorder, roundOneWinners, size = "md" }: GamePickerProps) {
  const max = choicesFor(round);
  const points = pointsFor(round);
  const byId = new Map(eligible.map((t) => [t.id, t]));
  const rowH = size === "md" ? "min-h-12 py-2" : "min-h-9 py-1.5";

  if (max === 1) {
    return (
      <div className="space-y-1.5">
        {eligible.map((team) => {
          const picked = choices[0] === team.id;
          return (
            <button
              key={team.id}
              type="button"
              onClick={() => onTap(team.id)}
              aria-pressed={picked}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg border px-3 transition-colors",
                rowH,
                picked ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500" : "bg-card hover:bg-muted"
              )}
            >
              <TeamFace team={team} size={size} />
              {roundOneWinners?.includes(team.id) && !picked && (
                <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">Your R1 pick</span>
              )}
              {picked ? (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
              ) : (
                <span className="h-6 w-6 shrink-0 rounded-full border-2 border-muted-foreground/30" />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  const remaining = eligible.filter((t) => !choices.includes(t.id));
  return (
    <div className="space-y-3">
      <RankedList
        key={choices.join(",")}
        choices={choices}
        byId={byId}
        points={points}
        size={size}
        rowH={rowH}
        onRemove={onTap}
        onReorder={onReorder}
      />
      {Array.from({ length: max - choices.length }, (_, i) => choices.length + i).map((slot) => (
        <div key={slot} className={cn("flex items-center gap-2.5 rounded-lg border border-dashed px-3 text-sm text-muted-foreground", rowH, slot === choices.length && "border-primary/50")}>
          <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border-2 text-[11px] font-bold", getPickColor(slot).border)}>{slot + 1}</span>
          <span className="flex-1">{slot === choices.length ? "Tap a team below" : "Open"}</span>
          <span className="text-xs">{points[slot]} pts</span>
        </div>
      ))}
      {remaining.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {choices.length < max ? `Tap to rank #${choices.length + 1}` : "All ranks filled. Remove a team to swap"}
          </p>
          {remaining.map((team) => (
            <button
              key={team.id}
              type="button"
              onClick={() => onTap(team.id)}
              className={cn("flex w-full items-center gap-2.5 rounded-lg border bg-card px-3 transition-colors hover:bg-muted", rowH, choices.length >= max && "opacity-60")}
            >
              <TeamFace team={team} size={size} />
            </button>
          ))}
        </div>
      )}
      {eligible.length === 0 && <p className="text-sm text-muted-foreground">Pick the earlier games first.</p>}
    </div>
  );
}

function RankedList({
  choices,
  byId,
  points,
  size,
  rowH,
  onRemove,
  onReorder,
}: {
  choices: string[];
  byId: Map<string, PickerTeam>;
  points: number[];
  size: "md" | "sm";
  rowH: string;
  onRemove: (teamId: string) => void;
  onReorder?: (order: string[]) => void;
}) {
  // Local order while dragging; committed once on drop so undo gets one step per reorder.
  // The parent re-keys this list whenever the saved choices change.
  const [order, setOrder] = useState(choices);
  const orderRef = useRef(choices);

  return (
    <Reorder.Group
      axis="y"
      values={order}
      onReorder={(next: string[]) => {
        orderRef.current = next;
        setOrder(next);
      }}
      className="space-y-1.5"
    >
      {order.map((id, i) => {
        const team = byId.get(id);
        const color = getPickColor(i);
        return (
          <Reorder.Item
            key={id}
            value={id}
            dragListener={!!onReorder}
            onDragEnd={() => onReorder?.(orderRef.current)}
            className={cn("flex touch-none select-none items-center gap-2.5 rounded-lg border bg-card px-2 shadow-sm", rowH, color.border, color.bg)}
          >
            {onReorder && <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing" aria-label="Drag to reorder" />}
            <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white", color.badge)}>{i + 1}</span>
            {team ? <TeamFace team={team} size={size} /> : <span className="flex-1 text-sm text-muted-foreground">{id}</span>}
            <span className="shrink-0 text-xs font-semibold text-muted-foreground">{points[i]} pts</span>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onRemove(id)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={`Remove ${team?.name ?? id}`}
            >
              <X className="h-4 w-4" />
            </button>
          </Reorder.Item>
        );
      })}
    </Reorder.Group>
  );
}
