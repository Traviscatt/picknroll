import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import bcrypt from "bcryptjs";

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
    const { role, newPassword } = body;

    const updateData: Record<string, unknown> = {};

    if (role && ["USER", "ADMIN"].includes(role)) {
      updateData.role = role;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 }
        );
      }
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
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
