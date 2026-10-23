import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canViewPool, getLivePayload } from "@/lib/live-service";

// GET /api/live?poolId=...&date=YYYYMMDD - Game Center data for a pool (members only).
// Personal numbers (verdicts, your rank, rooting) are computed in the browser from this shared payload.
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const poolId = params.get("poolId");
  const date = params.get("date");
  if (!poolId) return NextResponse.json({ error: "poolId is required" }, { status: 400 });
  if (date && !/^\d{8}$/.test(date)) return NextResponse.json({ error: "date must be YYYYMMDD" }, { status: 400 });
  if (!(await canViewPool(session.user.id, poolId, session.user.role === "ADMIN"))) {
    return NextResponse.json({ error: "Not a member of this pool" }, { status: 403 });
  }

  try {
    const payload = await getLivePayload(poolId, date);
    return NextResponse.json(payload, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Live payload error:", error);
    return NextResponse.json({ error: "Live scores are unavailable right now." }, { status: 502 });
  }
}
