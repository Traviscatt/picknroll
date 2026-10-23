"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { getTeamBySlug, generatePalette, THEME_VARS } from "@/lib/team-colors";
import { useTeamOptions } from "@/hooks/use-team-options";

export function TeamThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const favoriteTeam = session?.user?.favoriteTeam;
  const curated = favoriteTeam ? getTeamBySlug(favoriteTeam) : undefined;
  // Teams outside the curated list get their colors from the imported tournament field
  const { teams } = useTeamOptions(!!favoriteTeam && !curated);
  const team = curated ?? teams.find((t) => t.slug === favoriteTeam);

  useEffect(() => {
    const root = document.documentElement;
    THEME_VARS.forEach((v) => root.style.removeProperty(`--${v}`));
    if (!team) return;
    Object.entries(generatePalette(team.primary, team.secondary)).forEach(([key, value]) => root.style.setProperty(`--${key}`, value));
  }, [team]);

  return <>{children}</>;
}
