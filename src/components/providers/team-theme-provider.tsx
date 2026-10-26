"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useTheme } from "next-themes";
import { getTeamBySlug, generatePalette, THEME_VARS } from "@/lib/team-colors";
import { useTeamOptions } from "@/hooks/use-team-options";

export function TeamThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const favoriteTeam = session?.user?.favoriteTeam;
  const curated = favoriteTeam ? getTeamBySlug(favoriteTeam) : undefined;
  // Teams outside the curated list get their colors from the imported tournament field
  const { teams } = useTeamOptions(!!favoriteTeam && !curated);
  const team = curated ?? teams.find((t) => t.slug === favoriteTeam);
  const { resolvedTheme } = useTheme();
  const mode = resolvedTheme === "dark" ? "dark" : "light";

  useEffect(() => {
    const root = document.documentElement;
    THEME_VARS.forEach((v) => root.style.removeProperty(`--${v}`));
    if (!team) return;
    Object.entries(generatePalette(team.primary, team.secondary, mode)).forEach(([key, value]) => root.style.setProperty(`--${key}`, value));
  }, [team, mode]);

  return <>{children}</>;
}
