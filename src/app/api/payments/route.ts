import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { currentMembership } from "@/lib/pools";
import { PAYMENT_METHODS } from "@/lib/payment";

// GET /api/payments - Your entries in your current pool and where each payment stands
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await currentMembership(session.user.id);
  if (!membership) return NextResponse.json({ pool: null, entries: [] });
  const { pool } = membership;

  const brackets = await db.bracket.findMany({
    where: { userId: session.user.id, poolId: pool.id, status: { in: ["SUBMITTED", "PAID"] } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      entryName: true,
      paid: true,
      payments: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, status: true, method: true, note: true, createdAt: true } },
    },
  });

  return NextResponse.json({
    pool: { id: pool.id, name: pool.name, entryFee: pool.entryFee.toString(), paypalLink: pool.paypalLink, venmoHandle: pool.venmoHandle },
    entries: brackets.map(({ payments, ...b }) => ({ ...b, latestPayment: payments[0] ?? null })),
  });
}

const reportSchema = z.object({
  bracketIds: z.array(z.string().min(1)).min(1, "Pick at least one entry").max(20),
  method: z.enum(PAYMENT_METHODS),
  note: z.string().trim().max(200).optional(),
});

// POST /api/payments - Report that you paid for one or more entries (an admin confirms it)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = reportSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { bracketIds, method, note } = parsed.data;

  const membership = await currentMembership(session.user.id);
  if (!membership) return NextResponse.json({ error: "You're not in a pool" }, { status: 400 });
  const { pool } = membership;

  const brackets = await db.bracket.findMany({
    where: { id: { in: bracketIds }, userId: session.user.id, poolId: pool.id, status: { in: ["SUBMITTED", "PAID"] } },
    select: { id: true, entryName: true, paid: true, payments: { where: { status: "PENDING" }, select: { id: true } } },
  });
  if (brackets.length !== new Set(bracketIds).size) return NextResponse.json({ error: "Some of those entries aren't yours or aren't submitted" }, { status: 400 });
  const blocked = brackets.find((b) => b.paid || b.payments.length);
  if (blocked) {
    return NextResponse.json({ error: `${blocked.entryName} is already ${blocked.paid ? "paid" : "waiting for confirmation"}` }, { status: 409 });
  }

  await db.payment.createMany({
    data: brackets.map((b) => ({ amount: pool.entryFee, method, note: note || null, userId: session.user.id, poolId: pool.id, bracketId: b.id })),
  });

  // Let the pool's admins know there's something to confirm
  const admins = await db.user.findMany({
    where: { OR: [{ role: "ADMIN" }, { poolMemberships: { some: { poolId: pool.id, role: "ADMIN" } } }] },
    select: { id: true },
  });
  const who = session.user.name ?? "A member";
  await db.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      type: "PAYMENT_REPORTED",
      title: "Payment to confirm",
      message: `${who} reported paying for ${brackets.length} entr${brackets.length === 1 ? "y" : "ies"} (${method.toLowerCase()}).`,
    })),
  });

  return NextResponse.json({ reported: brackets.length });
}
