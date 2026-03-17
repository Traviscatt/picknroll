import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { sendEmail } from "@/lib/email";

// POST /api/admin/notifications/custom - Send custom notification to selected users or all
export async function POST(request: Request) {
  try {
    const { authorized, response } = await requireAdmin();
    if (!authorized) return response!;

    const body = await request.json();
    const { title, message, sendToAll, userIds, sendEmail: shouldSendEmail = true } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required" },
        { status: 400 }
      );
    }

    // Determine recipients
    let recipients: { id: string; name: string; email: string }[];

    if (sendToAll) {
      recipients = await db.user.findMany({
        select: { id: true, name: true, email: true },
      });
    } else if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      recipients = await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      });
    } else {
      return NextResponse.json(
        { error: "Select at least one recipient or send to all" },
        { status: 400 }
      );
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const user of recipients) {
      // Create in-app notification
      await db.notification.create({
        data: {
          userId: user.id,
          type: "ANNOUNCEMENT",
          title,
          message,
        },
      });

      // Send email if enabled
      if (shouldSendEmail) {
        const emailResult = await sendEmail({
          to: user.email,
          subject: `📢 ${title}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #ea580c;">Pick N Roll</h2>
              <p>Hi ${user.name || "Participant"},</p>
              <h3>${title}</h3>
              <p>${message.replace(/\n/g, "<br />")}</p>
              <p style="margin-top: 24px;">
                <a href="${process.env.NEXTAUTH_URL || "https://picknroll.net"}/dashboard" 
                   style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Go to Dashboard
                </a>
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
              <p style="color: #999; font-size: 12px;">Pick N Roll - Make Every Pick Count</p>
            </div>
          `,
        });

        if (emailResult.success) {
          sentCount++;
        } else {
          errors.push(`Failed to email ${user.email}: ${emailResult.error}`);
        }
      }
    }

    return NextResponse.json({
      message: "Custom notifications sent",
      notified: recipients.length,
      emailed: sentCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error sending custom notifications:", error);
    return NextResponse.json(
      { error: "Failed to send notifications" },
      { status: 500 }
    );
  }
}
