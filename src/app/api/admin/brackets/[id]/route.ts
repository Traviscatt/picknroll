import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

// GET /api/admin/brackets/[id] - Get a specific bracket
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await requireAdmin();
    if (!authorized) return response!;
    const { id } = await params;

    const bracket = await db.bracket.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        familyMember: {
          select: {
            id: true,
            name: true,
          },
        },
        picks: true,
      },
    });

    if (!bracket) {
      return NextResponse.json({ error: "Bracket not found" }, { status: 404 });
    }

    return NextResponse.json(bracket);
  } catch (error) {
    console.error("Error fetching bracket:", error);
    return NextResponse.json(
      { error: "Failed to fetch bracket" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/brackets/[id] - Update a bracket (paid status, scores, etc.)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await requireAdmin();
    if (!authorized) return response!;
    const { id } = await params;

    const body = await request.json();
    const { paid, totalScore, bonusScore, status } = body;

    const updateData: Record<string, unknown> = {};

    if (typeof paid === "boolean") {
      updateData.paid = paid;
    }
    if (typeof totalScore === "number") {
      updateData.totalScore = totalScore;
    }
    if (typeof bonusScore === "number") {
      updateData.bonusScore = bonusScore;
    }
    if (status) {
      updateData.status = status;
    }

    const bracket = await db.bracket.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(bracket);
  } catch (error) {
    console.error("Error updating bracket:", error);
    return NextResponse.json(
      { error: "Failed to update bracket" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/brackets/[id] - Delete a bracket
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await requireAdmin();
    if (!authorized) return response!;
    const { id } = await params;

    await db.bracket.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting bracket:", error);
    return NextResponse.json(
      { error: "Failed to delete bracket" },
      { status: 500 }
    );
  }
}
