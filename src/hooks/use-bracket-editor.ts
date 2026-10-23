"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { applyTap, pruneImpossible, reorderChoices, type GameSlot, type Picks, type TapResult } from "@/lib/picker";

const HISTORY_LIMIT = 50;

/**
 * Bracket picks with undo. Every edit clears later choices that it made impossible (with an Undo toast).
 * `version` bumps on every user edit (drives auto-save); loading picks doesn't count as an edit.
 */
export function useBracketEditor(games: GameSlot[]) {
  const [picks, setPicks] = useState<Picks>(new Map());
  const [version, setVersion] = useState(0);
  const [undoCount, setUndoCount] = useState(0);
  const picksRef = useRef(picks);
  const history = useRef<Picks[]>([]);

  const apply = useCallback((next: Picks) => {
    history.current.push(picksRef.current);
    if (history.current.length > HISTORY_LIMIT) history.current.shift();
    setUndoCount(history.current.length);
    picksRef.current = next;
    setPicks(next);
    setVersion((v) => v + 1);
  }, []);

  const undo = useCallback(() => {
    const prev = history.current.pop();
    if (!prev) return;
    setUndoCount(history.current.length);
    picksRef.current = prev;
    setPicks(prev);
    setVersion((v) => v + 1);
  }, []);

  /** Tap a team in a game; returns the result and the resulting picks */
  const tap = useCallback(
    (game: GameSlot, teamId: string): { result: TapResult; picks: Picks } => {
      const { picks: tapped, result } = applyTap(picksRef.current, game, teamId);
      if (result === "full") {
        toast("All ranks are filled", { description: "Remove a team first, then pick its replacement." });
        return { result, picks: picksRef.current };
      }
      const { picks: next, removed } = pruneImpossible(tapped, games);
      apply(next);
      if (removed.length) {
        toast(`Cleared ${removed.length} later pick${removed.length === 1 ? "" : "s"} that can no longer happen`, {
          action: { label: "Undo", onClick: undo },
        });
      }
      return { result, picks: next };
    },
    [apply, games, undo]
  );

  const reorder = useCallback((game: GameSlot, order: string[]) => apply(reorderChoices(picksRef.current, game, order)), [apply]);

  /** Remove picks matching a filter (e.g. a whole round), as one undoable step */
  const clear = useCallback(
    (keep: (gameId: string, round: number) => boolean) => {
      const next = new Map([...picksRef.current].filter(([gameId, p]) => keep(gameId, p.round)));
      apply(pruneImpossible(next, games).picks);
    },
    [apply, games]
  );

  /** Replace all picks without recording an edit (loading a saved bracket) */
  const load = useCallback((next: Picks) => {
    history.current = [];
    setUndoCount(0);
    picksRef.current = next;
    setPicks(next);
  }, []);

  return { picks, version, tap, reorder, clear, undo, load, canUndo: undoCount > 0 };
}
