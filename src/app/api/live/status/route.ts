import { NextResponse } from "next/server";
import { fetchScoreboard } from "@/lib/espn-live";
import { easternDate } from "@/lib/live";

// GET /api/live/status - Whether any tournament game is in progress (drives the navbar's live dot).
// Public ESPN information only; no database access, cached at the CDN for 30 s.
export async function GET() {
  const now = new Date();
  const month = Number(easternDate(now).slice(4, 6));
  let anyLive = false;
  if (month === 3 || month === 4) {
    try {
      const events = await fetchScoreboard(easternDate(now), 10_000);
      anyLive = events.some((e) => e.state === "in" || e.state === "half");
    } catch {
      anyLive = false;
    }
  }
  return NextResponse.json({ anyLive }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30" } });
}
