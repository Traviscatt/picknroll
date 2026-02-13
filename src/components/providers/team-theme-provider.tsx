"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { getTeamBySlug, generatePalette } from "@/lib/team-colors";

export function TeamThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const favoriteTeam = session?.user?.favoriteTeam;

  useEffect(() => {
    const root = document.documentElement;

    if (!favoriteTeam) {
      // Reset to defaults by removing overrides
      const vars = [
        "background", "foreground", "card", "card-foreground",
        "popover", "popover-foreground", "primary", "primary-foreground",
        "secondary", "secondary-foreground", "muted", "muted-foreground",
        "accent", "accent-foreground", "destructive", "border", "input", "ring",
        "chart-1", "chart-2", "chart-3", "chart-4", "chart-5",
        "sidebar", "sidebar-foreground", "sidebar-primary", "sidebar-primary-foreground",
        "sidebar-accent", "sidebar-accent-foreground", "sidebar-border", "sidebar-ring",
        "team-secondary", "team-secondary-foreground",
      ];
      vars.forEach((v) => root.style.removeProperty(`--${v}`));
      return;
    }

    const team = getTeamBySlug(favoriteTeam);
    if (!team) return;

    const palette = generatePalette(team.primary, team.secondary);

    Object.entries(palette).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
  }, [favoriteTeam]);

  return <>{children}</>;
}
