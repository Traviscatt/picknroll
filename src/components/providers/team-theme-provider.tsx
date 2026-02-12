"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { getTeamColor } from "@/lib/team-colors";

export function TeamThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  useEffect(() => {
    const team = getTeamColor(session?.user?.favoriteTeam);
    const root = document.documentElement;
    root.style.setProperty("--team-primary", team.primary);
    root.style.setProperty("--team-secondary", team.secondary);
  }, [session?.user?.favoriteTeam]);

  return <>{children}</>;
}
