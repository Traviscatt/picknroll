"use client";

import { useEffect, useState } from "react";
import type { LivePayload } from "@/lib/live";

const LIVE_INTERVAL = 15_000;

/** How long to wait before the next refresh: 15 s while a game is live, otherwise until close to the next tip-off */
export function nextRefreshDelay(data: LivePayload, now = Date.now()): number | null {
  if (data.anyLive) return LIVE_INTERVAL;
  if (!data.nextTipoff) return null;
  const untilTip = new Date(data.nextTipoff).getTime() - now;
  if (untilTip <= 30 * 60_000) return 30_000;
  return Math.min(untilTip - 5 * 60_000, 15 * 60_000);
}

interface LiveState {
  key: string;
  data: LivePayload | null;
  error: string | null;
  updatedAt: number | null;
}

/**
 * Game Center data for a pool and day. Polls only while games are live (or about to tip off)
 * and pauses while the page is hidden.
 */
export function useLiveData(poolId: string | null, date: string | null, enabled = true) {
  const key = `${poolId}:${date ?? ""}`;
  const [state, setState] = useState<LiveState>({ key: "", data: null, error: null, updatedAt: null });

  useEffect(() => {
    if (!poolId || !enabled) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pending = false;

    const schedule = (ms: number | null) => {
      clearTimeout(timer);
      if (ms != null) timer = setTimeout(load, ms);
    };

    async function load() {
      if (document.hidden) {
        pending = true; // refresh as soon as the page is visible again
        return;
      }
      pending = false;
      try {
        const params = new URLSearchParams({ poolId: poolId! });
        if (date) params.set("date", date);
        const res = await fetch(`/api/live?${params}`, { cache: "no-store" });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Live scores are unavailable");
        if (cancelled) return;
        setState({ key, data: body, error: null, updatedAt: Date.now() });
        schedule(nextRefreshDelay(body));
      } catch (e) {
        if (cancelled) return;
        setState((prev) => ({ ...prev, key, error: e instanceof Error ? e.message : "Live scores are unavailable" }));
        schedule(30_000);
      }
    }

    const onVisibility = () => {
      if (!document.hidden && pending) load();
    };
    load();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [poolId, date, enabled, key]);

  const current = state.key === key ? state : null;
  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    updatedAt: current?.updatedAt ?? null,
    loading: enabled && !!poolId && !current?.data && !current?.error,
  };
}

// One shared status check for every component on the page (navbar, tab bar, standings toggle)
let statusCache: { at: number; value: Promise<boolean> } | null = null;
function fetchAnyLive(): Promise<boolean> {
  if (statusCache && Date.now() - statusCache.at < 30_000) return statusCache.value;
  const value = fetch("/api/live/status")
    .then((res) => (res.ok ? res.json() : { anyLive: false }))
    .then((body) => !!body.anyLive)
    .catch(() => false);
  statusCache = { at: Date.now(), value };
  return value;
}

/** Whether any tournament game is in progress (navbar dot, standings toggle). Checks once a minute. */
export function useAnyLive(enabled = true) {
  const [anyLive, setAnyLive] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const check = () => fetchAnyLive().then((live) => !cancelled && setAnyLive(live));
    check();
    const timer = setInterval(() => !document.hidden && check(), 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled]);
  return anyLive;
}
