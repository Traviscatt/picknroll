import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

// GET /api/admin/payments?status=PENDING|CONFIRMED|REJECTED - Reported payments (newest first)
export async function GET(request: Request) {
  const { authorized, response } = await requireAdmin();
  if (!authorized) return response!;

  const status = new URL(request.url).searchParams.get("status") ?? "PENDING";
  const payments = await db.payment.findMany({
    where: { status },
    orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" },
    take: status === "PENDING" ? 500 : 100,
    select: {
      id: true,
      amount: true,
      method: true,
      note: true,
      status: true,
      createdAt: true,
      reviewedAt: true,
      user: { select: { name: true, email: true } },
      bracket: { select: { id: true, name: true, entryName: true, paid: true } },
    },
  });
  return NextResponse.json(payments.map((p) => ({ ...p, amount: p.amount.toString() })));
}
