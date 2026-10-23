import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { publishField, PublishError, publishSchema } from "@/lib/tournament-import";

// POST /api/admin/tournament/publish - Save a reviewed field (creates the tournament, or updates it safely)
export async function POST(request: Request) {
  const { authorized, response } = await requireAdmin();
  if (!authorized) return response!;

  const parsed = publishSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const result = await publishField(parsed.data);
    return NextResponse.json({
      ...result,
      message: result.created
        ? `Created the ${parsed.data.year} tournament with 64 teams and 63 games.`
        : result.locked
          ? "Updated team names, logos, colors, and records. Brackets were already submitted, so matchups were left as they are."
          : `Updated the ${parsed.data.year} tournament.`,
    });
  } catch (error) {
    if (error instanceof PublishError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Tournament publish error:", error);
    return NextResponse.json({ error: "Failed to save the tournament." }, { status: 500 });
  }
}
