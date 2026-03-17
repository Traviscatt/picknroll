import { Resend } from "resend";

const FROM_EMAIL = process.env.FROM_EMAIL || "Pick N Roll <noreply@picknroll.net>";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email send to:", to);
    return { success: false, error: "Email not configured" };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("Failed to send email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error: "Failed to send email" };
  }
}

export function paymentReminderEmail(userName: string, poolName: string, bracketName: string) {
  return {
    subject: `💰 Payment Reminder - ${poolName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ea580c;">Pick N Roll - Payment Reminder</h2>
        <p>Hi ${userName},</p>
        <p>This is a friendly reminder that your bracket <strong>"${bracketName}"</strong> in the <strong>${poolName}</strong> pool is still unpaid.</p>
        <p>Please submit your payment to secure your entry in the pool.</p>
        <p style="margin-top: 24px;">
          <a href="${process.env.NEXTAUTH_URL || "https://picknroll.net"}/payment" 
             style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Payment Options
          </a>
        </p>
        <p style="color: #666; font-size: 14px; margin-top: 24px;">
          If you've already paid, please disregard this message.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">Pick N Roll - Make Every Pick Count</p>
      </div>
    `,
  };
}

export function deadlineReminderEmail(userName: string, poolName: string, deadline: Date, hasDrafts: boolean) {
  const formattedDeadline = deadline.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return {
    subject: `⏰ Deadline Approaching - ${poolName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ea580c;">Pick N Roll - Deadline Reminder</h2>
        <p>Hi ${userName},</p>
        <p>The deadline for the <strong>${poolName}</strong> pool is approaching!</p>
        <p style="font-size: 18px; font-weight: bold; color: #dc2626;">
          Deadline: ${formattedDeadline}
        </p>
        ${hasDrafts ? `
          <p style="color: #dc2626; font-weight: bold;">
            ⚠️ You have unsubmitted draft brackets! Make sure to submit them before the deadline.
          </p>
        ` : ""}
        <p style="margin-top: 24px;">
          <a href="${process.env.NEXTAUTH_URL || "https://picknroll.net"}/brackets" 
             style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View My Brackets
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">Pick N Roll - Make Every Pick Count</p>
      </div>
    `,
  };
}
