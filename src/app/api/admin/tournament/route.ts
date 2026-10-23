import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { isTournamentLocked } from "@/lib/tournament-import";

// GET /api/admin/tournament - Tournaments with their setup status
export async function GET() {
  const { authorized, response } = await requireAdmin();
  if (!authorized) return response!;

  const tournaments = await db.tournament.findMany({
    orderBy: { year: "desc" },
    include: { _count: { select: { teams: true, games: true, pools: true } } },
  });

  return NextResponse.json(
    await Promise.all(
      tournaments.map(async (t) => ({
        id: t.id,
        name: t.name,
        year: t.year,
        regions: t.regions,
        startDate: t.startDate,
        teams: t._count.teams,
        games: t._count.games,
        pools: t._count.pools,
        locked: await isTournamentLocked(t.id),
      }))
    )
  );
}
