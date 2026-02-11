import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

// PATCH /api/admin/users/[id] - Update a user (role, etc.)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await requireAdmin();
    if (!authorized) return response!;
    const { id } = await params;

    const body = await request.json();
    const { role } = body;

    const updateData: Record<string, unknown> = {};

    if (role && ["USER", "ADMIN"].includes(role)) {
      updateData.role = role;
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
