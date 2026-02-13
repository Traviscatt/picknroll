import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// PATCH /api/user/profile - Update current user's profile
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, favoriteTeam } = body;

    const updateData: Record<string, unknown> = {};

    if (name && name.trim().length > 0) {
      updateData.name = name.trim();
    }

    if (favoriteTeam !== undefined) {
      updateData.favoriteTeam = favoriteTeam || null;
    }

    const user = await db.user.update({
      where: { id: session.user.id },
      data: updateData,
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
