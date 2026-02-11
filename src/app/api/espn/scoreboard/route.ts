import { NextResponse } from "next/server";
import { getScoreboard, parseGameResult } from "@/lib/espn-api";

// GET /api/espn/scoreboard - Fetch live scores from ESPN
export async function GET() {
  try {
    const scoreboard = await getScoreboard();
    
    const games = scoreboard.events.map((game) => {
      const result = parseGameResult(game);
      return {
        id: game.id,
        ...result,
      };
    });

    return NextResponse.json({
      games,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching ESPN scoreboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch live scores" },
      { status: 500 }
    );
  }
}
