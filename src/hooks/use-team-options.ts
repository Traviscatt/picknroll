"use client";

import { useEffect, useState } from "react";
import { TEAMS, type TeamInfo } from "@/lib/team-colors";

let cache: Promise<TeamInfo[]> | null = null;

/** Favorite-team choices from the imported tournament field (curated list until loaded or on failure) */
export function useTeamOptions(enabled = true) {
  const [teams, setTeams] = useState<TeamInfo[] | null>(null);
  useEffect(() => {
    if (!enabled) return;
    cache ??= fetch("/api/teams")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .catch(() => {
        cache = null;
        return TEAMS;
      });
    let cancelled = false;
    cache.then((list) => !cancelled && setTeams(list));
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return { teams: teams ?? TEAMS, loaded: teams !== null };
}
