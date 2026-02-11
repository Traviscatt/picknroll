import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { nanoid } from "nanoid";
import { z } from "zod";

const createPoolSchema = z.object({
  name: z.string().min(2, "Pool name must be at least 2 characters"),
  description: z.string().optional(),
  entryFee: z.number().min(0).default(5),
  deadline: z.string().datetime(),
  paypalLink: z.string().url().optional(),
  venmoHandle: z.string().optional(),
});

// GET /api/pools - Get user's pools
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pools = await db.pool.findMany({
      where: {
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            brackets: true,
          },
        },
      },
    });

    return NextResponse.json(pools);
  } catch (error) {
    console.error("Error fetching pools:", error);
    return NextResponse.json(
      { error: "Failed to fetch pools" },
      { status: 500 }
    );
  }
}

// POST /api/pools - Create a new pool
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = createPoolSchema.parse(body);

    // Generate unique invite code
    const inviteCode = nanoid(8).toUpperCase();

    // Get or create a tournament (for now, create a default 2026 tournament)
    let tournament = await db.tournament.findFirst({
      where: { year: 2026 },
    });

    if (!tournament) {
      tournament = await db.tournament.create({
        data: {
          name: "NCAA Tournament 2026",
          year: 2026,
          startDate: new Date("2026-03-19"),
          endDate: new Date("2026-04-06"),
        },
      });
    }

    const pool = await db.pool.create({
      data: {
        name: data.name,
        description: data.description,
        entryFee: data.entryFee,
        inviteCode,
        deadline: new Date(data.deadline),
        paypalLink: data.paypalLink,
        venmoHandle: data.venmoHandle,
        tournamentId: tournament.id,
        members: {
          create: {
            userId: session.user.id,
            role: "ADMIN",
          },
        },
      },
      include: {
        members: true,
      },
    });

    return NextResponse.json(pool, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Error creating pool:", error);
    return NextResponse.json(
      { error: "Failed to create pool" },
      { status: 500 }
    );
  }
}
