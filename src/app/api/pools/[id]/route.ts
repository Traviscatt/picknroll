import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// DELETE /api/pools/[id] - Delete a pool (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if user is admin of this pool
    const membership = await db.poolMember.findFirst({
      where: {
        poolId: id,
        userId: session.user.id,
        role: "ADMIN",
      },
    });

    if (!membership && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only pool admins can delete pools" },
        { status: 403 }
      );
    }

    // Delete all related data in order (due to foreign key constraints)
    // 1. Delete all picks for brackets in this pool
    await db.pick.deleteMany({
      where: {
        bracket: {
          poolId: id,
        },
      },
    });

    // 2. Delete all brackets in this pool
    await db.bracket.deleteMany({
      where: {
        poolId: id,
      },
    });

    // 3. Delete all pool members
    await db.poolMember.deleteMany({
      where: {
        poolId: id,
      },
    });

    // 4. Delete the pool itself
    await db.pool.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting pool:", error);
    return NextResponse.json(
      { error: "Failed to delete pool" },
      { status: 500 }
    );
  }
}
