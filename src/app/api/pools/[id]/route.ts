import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updatePoolSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  entryFee: z.number().min(0).optional(),
  deadline: z.string().optional(),
  venmoHandle: z.string().optional(),
  paypalLink: z.string().optional(),
  status: z.string().optional(),
});

// PATCH /api/pools/[id] - Update a pool (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const membership = await db.poolMember.findFirst({
      where: {
        poolId: id,
        userId: session.user.id,
        role: "ADMIN",
      },
    });

    if (!membership && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only pool admins can edit pools" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const data = updatePoolSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.entryFee !== undefined) updateData.entryFee = data.entryFee;
    if (data.deadline !== undefined) updateData.deadline = new Date(data.deadline);
    if (data.venmoHandle !== undefined) updateData.venmoHandle = data.venmoHandle;
    if (data.paypalLink !== undefined) updateData.paypalLink = data.paypalLink;
    if (data.status !== undefined) updateData.status = data.status;

    const pool = await db.pool.update({
      where: { id },
      data: updateData,
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        _count: { select: { brackets: true } },
      },
    });

    return NextResponse.json(pool);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Error updating pool:", error);
    return NextResponse.json(
      { error: "Failed to update pool" },
      { status: 500 }
    );
  }
}

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
