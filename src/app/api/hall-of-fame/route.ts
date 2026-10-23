import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hallOfFame } from "@/lib/hall-of-fame";

// GET /api/hall-of-fame - Every season's podium plus all-time leaders (signed-in members)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await hallOfFame());
}
