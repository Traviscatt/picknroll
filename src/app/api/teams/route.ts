import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentTournament } from "@/lib/scoring-service";
import { espnIdFromLogo, TEAMS, teamSlug, type TeamInfo } from "@/lib/team-colors";

// GET /api/teams - Favorite-team choices: the current tournament's field (incl. First Four teams).
// Public (used on registration) and CDN-cached. Curated colors win over ESPN's where we have them.
export async function GET() {
  const curatedByEspnId = new Map(TEAMS.map((t) => [espnIdFromLogo(t.logo), t]));
  const tournament = await getCurrentTournament();
  const slots = tournament
    ? await db.tournamentTeam.findMany({
        where: { tournamentId: tournament.id },
        select: {
          team: { select: { espnId: true, name: true, school: true, logo: true, color: true, alternateColor: true } },
          playInTeam: { select: { espnId: true, name: true, school: true, logo: true, color: true, alternateColor: true } },
        },
      })
    : [];

  const seen = new Set<string>();
  const teams: TeamInfo[] = [];
  for (const t of slots.flatMap((s) => [s.team, s.playInTeam])) {
    if (!t) continue;
    const curated = t.espnId ? curatedByEspnId.get(t.espnId) : undefined;
    const team: TeamInfo | null = curated
      ? curated
      : t.color && t.logo
        ? {
            slug: teamSlug(t.school ?? t.name),
            name: t.school ?? t.name,
            primary: `#${t.color}`,
            secondary: `#${t.alternateColor ?? "ffffff"}`,
            logo: t.logo,
          }
        : null;
    if (team && !seen.has(team.slug)) {
      seen.add(team.slug);
      teams.push(team);
    }
  }
  // Before any tournament is imported, fall back to the curated list
  const result = teams.length ? teams : TEAMS;
  result.sort((a, b) => a.name.localeCompare(b.name));
  return NextResponse.json(result, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
