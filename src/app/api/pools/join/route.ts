import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const joinPoolSchema = z.object({
  inviteCode: z.string().min(4, "Invalid invite code"),
});

// POST /api/pools/join - Join a pool with invite code
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { inviteCode } = joinPoolSchema.parse(body);

    // Find pool by invite code
    const pool = await db.pool.findUnique({
      where: { inviteCode: inviteCode.toUpperCase() },
      include: {
        members: true,
      },
    });

    if (!pool) {
      return NextResponse.json(
        { error: "Invalid invite code. Please check and try again." },
        { status: 404 }
      );
    }

    // Check if pool is still accepting entries
    if (pool.status !== "OPEN") {
      return NextResponse.json(
        { error: "This pool is no longer accepting entries." },
        { status: 400 }
      );
    }

    // Check if deadline has passed
    if (new Date() > pool.deadline) {
      return NextResponse.json(
        { error: "The deadline for this pool has passed." },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const existingMember = pool.members.find(
      (m: { userId: string }) => m.userId === session.user.id
    );

    if (existingMember) {
      return NextResponse.json(
        { error: "You are already a member of this pool." },
        { status: 400 }
      );
    }

    // Add user to pool
    await db.poolMember.create({
      data: {
        userId: session.user.id,
        poolId: pool.id,
        role: "MEMBER",
      },
    });

    return NextResponse.json({
      message: "Successfully joined the pool!",
      poolId: pool.id,
      poolName: pool.name,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Error joining pool:", error);
    return NextResponse.json(
      { error: "Failed to join pool" },
      { status: 500 }
    );
  }
}
