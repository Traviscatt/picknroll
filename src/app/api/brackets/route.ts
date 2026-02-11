import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/brackets - Get all brackets for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const brackets = await db.bracket.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        pool: true,
        familyMember: true,
        picks: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json(brackets);
  } catch (error) {
    console.error("Error fetching brackets:", error);
    return NextResponse.json(
      { error: "Failed to fetch brackets" },
      { status: 500 }
    );
  }
}

// POST /api/brackets - Create a new bracket
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, entryName, poolId, familyMemberId, tiebreaker, picks, status = "DRAFT" } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Bracket name is required" },
        { status: 400 }
      );
    }

    // If creating for a family member, verify they belong to this user
    if (familyMemberId) {
      const familyMember = await db.familyMember.findFirst({
        where: {
          id: familyMemberId,
          managedById: session.user.id,
        },
      });

      if (!familyMember) {
        return NextResponse.json(
          { error: "Family member not found" },
          { status: 404 }
        );
      }
    }

    // Check deadline if submitting to a pool
    if (status === "SUBMITTED" && poolId) {
      const pool = await db.pool.findUnique({
        where: { id: poolId },
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

    // Create bracket with picks data
    const bracket = await db.bracket.create({
      data: {
        name,
        entryName: entryName || name,
        status,
        userId: session.user.id,
        poolId: poolId || null,
        familyMemberId: familyMemberId || null,
        tiebreaker: tiebreaker || null,
        picksData: picks ? JSON.stringify(picks) : null,
        submittedAt: status === "SUBMITTED" ? new Date() : null,
      },
    });

    return NextResponse.json(bracket, { status: 201 });
  } catch (error) {
    console.error("Error creating bracket:", error);
    return NextResponse.json(
      { error: "Failed to create bracket" },
      { status: 500 }
    );
  }
}
