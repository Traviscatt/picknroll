import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { sendEmail, paymentReminderEmail } from "@/lib/email";

// POST /api/admin/notifications/payment-reminder - Send payment reminders to unpaid users
export async function POST(request: Request) {
  try {
    const { authorized, response } = await requireAdmin();
    if (!authorized) return response!;

    const body = await request.json();
    const { bracketIds } = body; // Optional: specific brackets, or all unpaid if not provided

    // Get unpaid brackets with user info
    const unpaidBrackets = await db.bracket.findMany({
      where: {
        paid: false,
        status: { in: ["SUBMITTED", "PAID"] },
        ...(bracketIds ? { id: { in: bracketIds } } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        pool: { select: { name: true } },
      },
    });

    if (unpaidBrackets.length === 0) {
      return NextResponse.json({ message: "No unpaid brackets found", sent: 0 });
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const bracket of unpaidBrackets) {
      const poolName = bracket.pool?.name || "Pick N Roll Pool";
      const userName = bracket.user.name || "Participant";

      // Create in-app notification
      await db.notification.create({
        data: {
          userId: bracket.user.id,
          type: "PAYMENT_REMINDER",
          title: "Payment Reminder",
          message: `Your bracket "${bracket.name}" in ${poolName} is still unpaid. Please submit your payment.`,
        },
      });

      // Send email
      const { subject, html } = paymentReminderEmail(userName, poolName, bracket.name);
      const emailResult = await sendEmail({
        to: bracket.user.email,
        subject,
        html,
      });

      if (emailResult.success) {
        sentCount++;
        // Mark notification as email sent
        await db.notification.updateMany({
          where: {
            userId: bracket.user.id,
            type: "PAYMENT_REMINDER",
            emailSent: false,
          },
          data: { emailSent: true },
        });
      } else {
        errors.push(`Failed to email ${bracket.user.email}: ${emailResult.error}`);
      }
    }

    return NextResponse.json({
      message: `Payment reminders sent`,
      sent: sentCount,
      total: unpaidBrackets.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error sending payment reminders:", error);
    return NextResponse.json(
      { error: "Failed to send payment reminders" },
      { status: 500 }
    );
  }
}
