import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getCurrentTournament, recalculateScores } from "@/lib/scoring-service";

// POST /api/admin/score - Recalculate all bracket scores based on game results
export async function POST() {
  try {
    const { authorized, response } = await requireAdmin();
    if (!authorized) return response!;

    // Get the current tournament (latest year)
    const tournament = await getCurrentTournament();

    if (!tournament) {
      return NextResponse.json({
        message: "No tournament found.",
        bracketsUpdated: 0,
      });
    }

    // With no completed games every bracket scores 0, which resets stale scores
    const { bracketsScored, bracketsChanged, gamesScored } = await recalculateScores(tournament.id);

    return NextResponse.json({
      message: `Scores recalculated for ${bracketsScored} brackets (${bracketsChanged} changed).`,
      bracketsUpdated: bracketsScored,
      bracketsChanged,
      gamesScored,
    });
  } catch (error) {
    console.error("Error calculating scores:", error);
    return NextResponse.json(
      { error: "Failed to calculate scores" },
      { status: 500 }
    );
  }
}
