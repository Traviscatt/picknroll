import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { loadField, tournamentIdForPool } from "@/lib/tournament-service";

// GET /api/tournament/field?poolId=... - Teams in bracket slots for a pool's tournament (default: current tournament)
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tournamentId = await tournamentIdForPool(new URL(request.url).searchParams.get("poolId"));
  const field = tournamentId ? await loadField(tournamentId) : null;
  if (!field) {
    return NextResponse.json({ error: "No tournament found" }, { status: 404 });
  }

  return NextResponse.json(field, { headers: { "Cache-Control": "private, max-age=60" } });
}
