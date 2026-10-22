import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { syncEspnResults } from "@/lib/espn-sync";

// POST /api/admin/espn-sync - Pull results from ESPN and auto-score brackets
export async function POST(request: Request) {
  try {
    const { authorized, response } = await requireAdmin();
    if (!authorized) return response!;

    const body = await request.json().catch(() => ({}));
    const result = await syncEspnResults({ dates: body.dates, rescore: "always" });

    if (result.status === "no-tournament") {
      return NextResponse.json({ error: "No tournament found" }, { status: 404 });
    }

    return NextResponse.json({
      message: `ESPN sync complete. ${result.gamesUpdated} games updated, ${result.bracketsUpdated} brackets scored.`,
      gamesFound: result.gamesFound,
      gamesUpdated: result.gamesUpdated,
      bracketsUpdated: result.bracketsUpdated,
      gamesScored: result.gamesScored,
    });
  } catch (error) {
    console.error("ESPN sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync ESPN data" },
      { status: 500 }
    );
  }
}
