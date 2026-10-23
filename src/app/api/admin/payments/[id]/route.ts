import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

const bodySchema = z.object({ action: z.enum(["confirm", "reject"]), reason: z.string().trim().max(200).optional() });

// POST /api/admin/payments/[id] - Confirm (marks the entry paid) or reject a reported payment
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { authorized, response, session } = await requireAdmin();
  if (!authorized || !session) return response!;

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  const { action, reason } = parsed.data;
  const { id } = await params;

  const payment = await db.payment.findUnique({ where: { id }, include: { bracket: { select: { id: true, entryName: true, status: true } } } });
  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  if (payment.status !== "PENDING") return NextResponse.json({ error: `Already ${payment.status.toLowerCase()}` }, { status: 409 });

  const entry = payment.bracket?.entryName ?? "your entry";
  await db.$transaction([
    db.payment.update({
      where: { id },
      data: { status: action === "confirm" ? "CONFIRMED" : "REJECTED", reviewedAt: new Date(), reviewedById: session.user.id, ...(reason && { note: [payment.note, `Admin: ${reason}`].filter(Boolean).join(" · ") }) },
    }),
    ...(action === "confirm" && payment.bracket
      ? [db.bracket.update({ where: { id: payment.bracket.id }, data: { paid: true, ...(payment.bracket.status === "SUBMITTED" && { status: "PAID" }) } })]
      : []),
    db.notification.create({
      data: {
        userId: payment.userId,
        type: action === "confirm" ? "PAYMENT_CONFIRMED" : "PAYMENT_REJECTED",
        title: action === "confirm" ? "Payment confirmed" : "Payment not found",
        message:
          action === "confirm"
            ? `Thanks! ${entry} is paid and eligible for prizes.`
            : `We couldn't match your payment for ${entry}.${reason ? ` ${reason}` : ""} Check the payment page or contact the admin.`,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
