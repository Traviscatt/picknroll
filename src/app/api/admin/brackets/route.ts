import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

// GET /api/admin/brackets - Get all brackets for admin
export async function GET() {
  try {
    const { authorized, response } = await requireAdmin();
    if (!authorized) return response!;

    const brackets = await db.bracket.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        familyMember: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
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
