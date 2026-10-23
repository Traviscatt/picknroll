import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { bracketInputSchema, poolLockedReason, validatePicks } from "@/lib/bracket-validation";
import { regionsForPool } from "@/lib/tournament-service";

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

    const parsed = bracketInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { name, entryName, poolId, familyMemberId, tiebreaker, picks, status = "DRAFT" } = parsed.data;

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

    // Brackets can only be added to a pool you belong to, while it's open and before the deadline
    if (poolId) {
      const membership = await db.poolMember.findFirst({
        where: { poolId, userId: session.user.id },
        select: { pool: { select: { deadline: true, status: true } } },
      });
      if (!membership) {
        return NextResponse.json({ error: "You are not a member of this pool." }, { status: 403 });
      }
      const lockedReason = poolLockedReason(membership.pool);
      if (lockedReason) {
        return NextResponse.json({ error: lockedReason }, { status: 400 });
      }
    }

    const isSubmitted = status === "SUBMITTED";
    const picksValidation = validatePicks(picks ?? [], { requireComplete: isSubmitted, regions: await regionsForPool(poolId) });
    if (!picksValidation.ok) {
      return NextResponse.json({ error: picksValidation.error }, { status: 400 });
    }
    if (isSubmitted && tiebreaker == null) {
      return NextResponse.json({ error: "A tiebreaker is required to submit." }, { status: 400 });
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
        tiebreaker: tiebreaker ?? null,
        picksData: picks !== undefined ? JSON.stringify(picksValidation.picks) : null,
        submittedAt: isSubmitted ? new Date() : null,
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
