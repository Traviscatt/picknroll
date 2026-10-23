"use client";

import { useEffect, useMemo, useState } from "react";
import { createFieldLookup, type TournamentField } from "@/lib/tournament-field";

// One request per pool per page load, shared by every component that needs the field
const cache = new Map<string, Promise<TournamentField>>();

function fetchField(poolId: string | null): Promise<TournamentField> {
  const key = poolId ?? "current";
  let request = cache.get(key);
  if (!request) {
    const url = poolId ? `/api/tournament/field?poolId=${encodeURIComponent(poolId)}` : "/api/tournament/field";
    request = fetch(url).then(async (res) => {
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to load teams");
      return res.json();
    });
    request.catch(() => cache.delete(key));
    cache.set(key, request);
  }
  return request;
}

/**
 * Teams for a pool's tournament (default: the current tournament).
 * Pass `enabled: false` to wait until the pool is known.
 */
export function useTournamentField(poolId: string | null = null, enabled = true) {
  const [result, setResult] = useState<{ key: string; field: TournamentField | null; error: string | null } | null>(null);
  const key = poolId ?? "current";

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    fetchField(poolId)
      .then((field) => active && setResult({ key, field, error: null }))
      .catch((e: Error) => active && setResult({ key, field: null, error: e.message }));
    return () => {
      active = false;
    };
  }, [poolId, key, enabled]);

  const current = result?.key === key ? result : null;
  const field = current?.field ?? null;
  const lookup = useMemo(() => createFieldLookup(field), [field]);
  return { field, lookup, loading: enabled && !current, error: current?.error ?? null };
}
