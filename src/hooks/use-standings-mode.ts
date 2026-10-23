"use client";

import { useCallback, useSyncExternalStore } from "react";

export type StandingsMode = "official" | "live";

const KEY = "pnr.standingsMode";
const listeners = new Set<() => void>();

function read(): StandingsMode {
  try {
    return localStorage.getItem(KEY) === "live" ? "live" : "official";
  } catch {
    return "official";
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Official ⇄ Live standings, remembered per device and shared by the leaderboard and Game Center. Defaults to Official. */
export function useStandingsMode(): [StandingsMode, (mode: StandingsMode) => void] {
  const mode = useSyncExternalStore(subscribe, read, () => "official" as const);
  const setMode = useCallback((next: StandingsMode) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Private mode: keep the choice for this page only
    }
    listeners.forEach((l) => l());
  }, []);
  return [mode, setMode];
}
