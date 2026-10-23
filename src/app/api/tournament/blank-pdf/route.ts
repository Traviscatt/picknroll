import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { renderBracketPdf } from "@/lib/bracket-pdf";
import { loadField, tournamentIdForPool } from "@/lib/tournament-service";

// GET /api/tournament/blank-pdf?poolId=... - Printable blank bracket for a pool's tournament (default: current)
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tournamentId = await tournamentIdForPool(new URL(request.url).searchParams.get("poolId"));
  const field = tournamentId ? await loadField(tournamentId) : null;
  if (!field || field.tournament.regions.length !== 4 || field.teams.length !== 64) {
    return NextResponse.json({ error: "The tournament bracket isn't set up yet." }, { status: 404 });
  }

  const pdfBytes = await renderBracketPdf({ field });
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${field.tournament.year}-bracket.pdf"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
