import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getCurrentTournament } from "@/lib/scoring-service";

const createPoolSchema = z.object({
  name: z.string().min(2, "Pool name must be at least 2 characters"),
  description: z.string().optional(),
  entryFee: z.number().min(0).default(5),
  // Defaults to the tournament's first Round 1 tip-off
  deadline: z.string().datetime().optional(),
  paypalLink: z.string().optional(),
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

    // Member emails are only visible to pool admins and site admins
    const isSiteAdmin = session.user.role === "ADMIN";
    const visiblePools = pools.map((pool) => {
      const isPoolAdmin = pool.members.some((m) => m.userId === session.user.id && m.role === "ADMIN");
      if (isSiteAdmin || isPoolAdmin) return pool;
      return {
        ...pool,
        members: pool.members.map((m) => ({ ...m, user: { id: m.user.id, name: m.user.name } })),
      };
    });

    return NextResponse.json(visiblePools);
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

    // Pools belong to the current tournament, which an admin imports from ESPN (Admin → Tournament)
    const tournament = await getCurrentTournament();
    if (!tournament) {
      return NextResponse.json(
        { error: "There's no tournament yet. Import it first under Admin → Tournament." },
        { status: 400 }
      );
    }

    const pool = await db.pool.create({
      data: {
        name: data.name,
        description: data.description,
        entryFee: data.entryFee,
        inviteCode,
        deadline: data.deadline ? new Date(data.deadline) : tournament.startDate,
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
