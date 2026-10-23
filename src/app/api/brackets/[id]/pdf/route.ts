import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { renderBracketPdf } from "@/lib/bracket-pdf";
import { parsePicksData } from "@/lib/scoring-engine";
import { loadField, tournamentIdForPool } from "@/lib/tournament-service";

// GET /api/brackets/[id]/pdf - Printable copy of your bracket
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const bracket = await db.bracket.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!bracket) {
      return NextResponse.json({ error: "Bracket not found" }, { status: 404 });
    }

    const picks = parsePicksData(bracket.picksData);
    if (picks.length === 0) {
      return NextResponse.json({ error: "No picks to export" }, { status: 400 });
    }

    const tournamentId = await tournamentIdForPool(bracket.poolId);
    const field = tournamentId ? await loadField(tournamentId) : null;
    if (!field || field.tournament.regions.length !== 4) {
      return NextResponse.json({ error: "The tournament bracket isn't set up yet." }, { status: 400 });
    }

    const pdfBytes = await renderBracketPdf({
      field,
      picks,
      bracketName: bracket.name,
      entryName: bracket.entryName,
      tiebreaker: bracket.tiebreaker,
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${bracket.name.replace(/[^a-zA-Z0-9]/g, "_")}_bracket.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating bracket PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
