"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SwitcherEntry {
  id: string;
  name: string;
}

/** Phones: dots + arrows to move between your entries in the same pool */
export function EntrySwitcher({ entries, currentId, onGo }: { entries: SwitcherEntry[]; currentId: string; onGo: (id: string) => void }) {
  const index = entries.findIndex((e) => e.id === currentId);
  if (entries.length < 2 || index === -1) return null;
  const prev = entries[index - 1];
  const next = entries[index + 1];
  return (
    <div className="flex items-center gap-2 lg:hidden" aria-label="Your entries">
      <button type="button" onClick={() => prev && onGo(prev.id)} disabled={!prev} className="rounded-full p-1.5 text-muted-foreground disabled:opacity-30" aria-label={prev ? `Previous entry: ${prev.name}` : "No previous entry"}>
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
        <div className="flex gap-1.5">
          {entries.map((e) => (
            <button key={e.id} type="button" onClick={() => onGo(e.id)} aria-label={e.name} aria-current={e.id === currentId ? "true" : undefined} className={cn("h-2 rounded-full transition-all", e.id === currentId ? "w-5 bg-primary" : "w-2 bg-muted-foreground/30")} />
          ))}
        </div>
        <span className="text-[11px] text-muted-foreground">
          Entry {index + 1} of {entries.length} · swipe to switch
        </span>
      </div>
      <button type="button" onClick={() => next && onGo(next.id)} disabled={!next} className="rounded-full p-1.5 text-muted-foreground disabled:opacity-30" aria-label={next ? `Next entry: ${next.name}` : "No next entry"}>
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

/** Horizontal swipe handlers (ignores mostly-vertical gestures) */
export function useSwipe(onLeft: () => void, onRight: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0];
      start.current = { x: t.clientX, y: t.clientY };
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (!start.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.current.x;
      const dy = t.clientY - start.current.y;
      start.current = null;
      if (Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.6) return;
      if (dx < 0) onLeft();
      else onRight();
    },
  };
}
