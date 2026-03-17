import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { sendEmail, deadlineReminderEmail } from "@/lib/email";

// POST /api/admin/notifications/deadline-reminder - Send deadline reminders to all pool members
export async function POST() {
  try {
    const { authorized, response } = await requireAdmin();
    if (!authorized) return response!;

    // Get all open pools with upcoming deadlines
    const pools = await db.pool.findMany({
      where: {
        status: "OPEN",
        deadline: { gt: new Date() },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (pools.length === 0) {
      return NextResponse.json({ message: "No open pools found", sent: 0 });
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const pool of pools) {
      for (const member of pool.members) {
        // Check if user has any draft brackets in this pool
        const draftBrackets = await db.bracket.count({
          where: {
            userId: member.user.id,
            poolId: pool.id,
            status: "DRAFT",
          },
        });

        const hasDrafts = draftBrackets > 0;
        const userName = member.user.name || "Participant";

        // Create in-app notification
        await db.notification.create({
          data: {
            userId: member.user.id,
            type: "DEADLINE_REMINDER",
            title: "Deadline Approaching",
            message: `The deadline for ${pool.name} is ${pool.deadline.toLocaleDateString()}. ${hasDrafts ? "You have unsubmitted brackets!" : "Make sure your brackets are ready!"}`,
          },
        });

        // Send email
        const { subject, html } = deadlineReminderEmail(
          userName,
          pool.name,
          pool.deadline,
          hasDrafts
        );

        const emailResult = await sendEmail({
          to: member.user.email,
          subject,
          html,
        });

        if (emailResult.success) {
          sentCount++;
          await db.notification.updateMany({
            where: {
              userId: member.user.id,
              type: "DEADLINE_REMINDER",
              emailSent: false,
            },
            data: { emailSent: true },
          });
        } else {
          errors.push(`Failed to email ${member.user.email}: ${emailResult.error}`);
        }
      }
    }

    return NextResponse.json({
      message: "Deadline reminders sent",
      sent: sentCount,
      pools: pools.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error sending deadline reminders:", error);
    return NextResponse.json(
      { error: "Failed to send deadline reminders" },
      { status: 500 }
    );
  }
}
