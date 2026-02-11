import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

// GET /api/admin/settings - Get the admin's pool settings
export async function GET() {
  try {
    const { authorized, response, session } = await requireAdmin();
    if (!authorized || !session) return response;

    // Find the pool where this user is an admin
    const membership = await db.poolMember.findFirst({
      where: {
        userId: session.user.id,
        role: "ADMIN",
      },
      include: {
        pool: true,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "No pool found" }, { status: 404 });
    }

    const pool = membership.pool;
    return NextResponse.json({
      id: pool.id,
      name: pool.name,
      description: pool.description || "",
      entryFee: parseFloat(pool.entryFee.toString()),
      deadline: pool.deadline.toISOString().slice(0, 16), // datetime-local format
      status: pool.status,
      venmoHandle: pool.venmoHandle || "",
      paypalLink: pool.paypalLink || "",
      inviteCode: pool.inviteCode,
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/settings - Update pool settings
export async function PATCH(req: NextRequest) {
  try {
    const { authorized, response, session } = await requireAdmin();
    if (!authorized || !session) return response;

    const body = await req.json();
    const { name, description, entryFee, deadline, venmoHandle, paypalLink, status } = body;

    // Find the pool where this user is an admin
    const membership = await db.poolMember.findFirst({
      where: {
        userId: session.user.id,
        role: "ADMIN",
      },
      select: { poolId: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No pool found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (entryFee !== undefined) updateData.entryFee = parseFloat(entryFee);
    if (deadline !== undefined) updateData.deadline = new Date(deadline);
    if (venmoHandle !== undefined) updateData.venmoHandle = venmoHandle || null;
    if (paypalLink !== undefined) updateData.paypalLink = paypalLink || null;
    if (status !== undefined && ["OPEN", "CLOSED"].includes(status)) {
      updateData.status = status;
    }

    const pool = await db.pool.update({
      where: { id: membership.poolId },
      data: updateData,
    });

    return NextResponse.json({
      id: pool.id,
      name: pool.name,
      description: pool.description || "",
      entryFee: parseFloat(pool.entryFee.toString()),
      deadline: pool.deadline.toISOString().slice(0, 16),
      status: pool.status,
      venmoHandle: pool.venmoHandle || "",
      paypalLink: pool.paypalLink || "",
      inviteCode: pool.inviteCode,
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
