import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/brackets/[id] - Get a single bracket
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const bracket = await db.bracket.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        pool: true,
        familyMember: true,
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

// PATCH /api/brackets/[id] - Update a bracket
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Verify ownership
    const existing = await db.bracket.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Bracket not found" }, { status: 404 });
    }

    const { name, entryName, status, tiebreaker, picks, poolId } = body;

    // Check deadline if submitting
    if (status === "SUBMITTED") {
      const bracketPoolId = poolId || existing.poolId;
      if (bracketPoolId) {
        const pool = await db.pool.findUnique({
          where: { id: bracketPoolId },
          select: { deadline: true, status: true },
        });

        if (pool) {
          if (pool.status !== "OPEN") {
            return NextResponse.json(
              { error: "This pool is no longer accepting submissions." },
              { status: 400 }
            );
          }
          if (new Date() > pool.deadline) {
            return NextResponse.json(
              { error: "The submission deadline for this pool has passed." },
              { status: 400 }
            );
          }
        }
      }
    }

    const bracket = await db.bracket.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(entryName && { entryName }),
        ...(status && { status }),
        ...(tiebreaker !== undefined && { tiebreaker }),
        ...(picks !== undefined && { picksData: JSON.stringify(picks) }),
        ...(status === "SUBMITTED" && !existing.submittedAt && { submittedAt: new Date() }),
      },
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

// DELETE /api/brackets/[id] - Delete a bracket
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await db.bracket.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Bracket not found" }, { status: 404 });
    }

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
