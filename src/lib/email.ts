import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

const FROM_EMAIL = process.env.FROM_EMAIL;

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

let sesClient: SESv2Client | undefined;

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!FROM_EMAIL) {
    console.warn("FROM_EMAIL not set, skipping email send to:", to);
    return { success: false, error: "Email not configured" };
  }

  try {
    sesClient ??= new SESv2Client({});
    const result = await sesClient.send(
      new SendEmailCommand({
        FromEmailAddress: FROM_EMAIL,
        Destination: { ToAddresses: [to] },
        Content: {
          Simple: {
            Subject: { Data: subject, Charset: "UTF-8" },
            Body: { Html: { Data: html, Charset: "UTF-8" } },
          },
        },
      })
    );

    return { success: true, id: result.MessageId };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error: "Failed to send email" };
  }
}

// Escape user-provided text before putting it in email HTML
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const APP_URL = process.env.NEXTAUTH_URL || "https://picknroll.net";

export function passwordResetEmail(userName: string, resetUrl: string) {
  return {
    subject: "Reset your Pick N Roll password",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ea580c;">Pick N Roll - Password Reset</h2>
        <p>Hi ${escapeHtml(userName)},</p>
        <p>We received a request to reset your password. This link expires in 1 hour.</p>
        <p style="margin-top: 24px;">
          <a href="${resetUrl}"
             style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p style="color: #666; font-size: 14px; margin-top: 24px;">
          If you didn't request this, you can ignore this email. Your password won't change.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">Pick N Roll - Make Every Pick Count</p>
      </div>
    `,
  };
}

export function paymentReminderEmail(userName: string, poolName: string, bracketName: string) {
  return {
    subject: `💰 Payment Reminder - ${poolName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ea580c;">Pick N Roll - Payment Reminder</h2>
        <p>Hi ${escapeHtml(userName)},</p>
        <p>This is a friendly reminder that your bracket <strong>"${escapeHtml(bracketName)}"</strong> in the <strong>${escapeHtml(poolName)}</strong> pool is still unpaid.</p>
        <p>Please submit your payment to secure your entry in the pool.</p>
        <p style="margin-top: 24px;">
          <a href="${APP_URL}/payment" 
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
        <p>Hi ${escapeHtml(userName)},</p>
        <p>The deadline for the <strong>${escapeHtml(poolName)}</strong> pool is approaching!</p>
        <p style="font-size: 18px; font-weight: bold; color: #dc2626;">
          Deadline: ${formattedDeadline}
        </p>
        ${hasDrafts ? `
          <p style="color: #dc2626; font-weight: bold;">
            ⚠️ You have unsubmitted draft brackets! Make sure to submit them before the deadline.
          </p>
        ` : ""}
        <p style="margin-top: 24px;">
          <a href="${APP_URL}/brackets" 
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
