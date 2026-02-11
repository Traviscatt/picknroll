import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/family-members/[id] - Get a specific family member
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const familyMember = await db.familyMember.findFirst({
      where: {
        id,
        managedById: session.user.id,
      },
      include: {
        brackets: true,
      },
    });

    if (!familyMember) {
      return NextResponse.json(
        { error: "Family member not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(familyMember);
  } catch (error) {
    console.error("Error fetching family member:", error);
    return NextResponse.json(
      { error: "Failed to fetch family member" },
      { status: 500 }
    );
  }
}

// PATCH /api/family-members/[id] - Update a family member
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email } = body;

    // Verify ownership
    const existing = await db.familyMember.findFirst({
      where: {
        id,
        managedById: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Family member not found" },
        { status: 404 }
      );
    }

    const familyMember = await db.familyMember.update({
      where: { id },
      data: {
        name: name?.trim() || existing.name,
        email: email?.trim() || existing.email,
      },
    });

    return NextResponse.json(familyMember);
  } catch (error) {
    console.error("Error updating family member:", error);
    return NextResponse.json(
      { error: "Failed to update family member" },
      { status: 500 }
    );
  }
}

// DELETE /api/family-members/[id] - Delete a family member
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const existing = await db.familyMember.findFirst({
      where: {
        id,
        managedById: session.user.id,
      },
      include: {
        brackets: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Family member not found" },
        { status: 404 }
      );
    }

    // Delete the family member (brackets will be orphaned but still exist)
    await db.familyMember.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting family member:", error);
    return NextResponse.json(
      { error: "Failed to delete family member" },
      { status: 500 }
    );
  }
}
