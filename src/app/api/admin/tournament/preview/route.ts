import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { fetchEspnFieldEvents, parseEspnField } from "@/lib/espn-field";
import { existingTournamentSummary, savedSchoolNames } from "@/lib/tournament-import";

const bodySchema = z.object({ selectionSunday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the Selection Sunday date (YYYY-MM-DD).") });

// POST /api/admin/tournament/preview - Read the field from ESPN for review. Nothing is saved.
export async function POST(request: Request) {
  const { authorized, response } = await requireAdmin();
  if (!authorized) return response!;

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const field = parseEspnField(await fetchEspnFieldEvents(parsed.data.selectionSunday));
    if (field.slots.length === 0) {
      return NextResponse.json(
        { error: "ESPN has no First Four or Round 1 games in the week after that date yet. Check the date, or try again once the bracket is announced." },
        { status: 404 }
      );
    }

    // Names an admin fixed before (e.g. "Miami (FL)") win over ESPN's defaults
    const teams = field.slots.flatMap((s) => [s.team, s.playIn].filter((t) => t !== null));
    const saved = await savedSchoolNames(teams.map((t) => t.espnId));
    for (const team of teams) team.school = saved.get(team.espnId) ?? team.school;

    const year = Number(parsed.data.selectionSunday.slice(0, 4));
    const start = field.firstRoundTipoff ?? field.startDate;
    return NextResponse.json({
      year,
      name: `${year} NCAA Men's Basketball Tournament`,
      startDate: start ? new Date(start).toISOString() : null,
      field,
      existing: await existingTournamentSummary(year),
    });
  } catch (error) {
    console.error("Tournament preview error:", error);
    return NextResponse.json({ error: "Couldn't read the bracket from ESPN. Try again in a minute." }, { status: 502 });
  }
}
