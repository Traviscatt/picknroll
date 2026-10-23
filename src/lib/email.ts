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
  const formattedDeadline = formatEastern(deadline);

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

/** "Thursday, March 19, 12:15 PM EDT" in US Eastern time (servers run in UTC) */
export function formatEastern(date: Date) {
  return date.toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

const BRAND = "#29503c";

function button(href: string, label: string) {
  return `<p style="margin-top:24px"><a href="${href}" style="background-color:${BRAND};color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600">${escapeHtml(label)}</a></p>`;
}

/** Shared frame for reminder emails, with a one-click unsubscribe link */
function layout(title: string, body: string, unsubscribe?: string) {
  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1a1a2e">
      <h2 style="color:${BRAND};margin-bottom:4px">${escapeHtml(title)}</h2>
      ${body}
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
      <p style="color:#999;font-size:12px">Pick N Roll · Make Every Pick Count${
        unsubscribe ? ` · <a href="${unsubscribe}" style="color:#999">Unsubscribe from reminders</a>` : ""
      }</p>
    </div>`;
}

export function seasonOpenEmail(userName: string, poolName: string, deadline: Date, unsubscribe: string) {
  return {
    subject: `🏀 Brackets are open: ${poolName}`,
    html: layout(
      "A new season is here",
      `<p>Hi ${escapeHtml(userName)},</p>
       <p>The <strong>${escapeHtml(poolName)}</strong> pool is open and you're already in it.</p>
       <p>Picks lock at <strong>${formatEastern(deadline)}</strong>.</p>
       ${button(`${APP_URL}/brackets/new`, "Fill out your bracket")}`,
      unsubscribe
    ),
  };
}

export function deadlineSoonEmail(userName: string, poolName: string, deadline: Date, hasDrafts: boolean, unsubscribe: string) {
  return {
    subject: `⏰ Picks lock soon: ${poolName}`,
    html: layout(
      "Picks lock soon",
      `<p>Hi ${escapeHtml(userName)},</p>
       <p>Brackets for <strong>${escapeHtml(poolName)}</strong> lock at <strong>${formatEastern(deadline)}</strong>.</p>
       <p>${hasDrafts ? "You have a draft that isn't submitted yet. Submit it before the deadline so it counts." : "You haven't submitted a bracket yet."}</p>
       ${button(`${APP_URL}/brackets`, hasDrafts ? "Finish my bracket" : "Fill out a bracket")}`,
      unsubscribe
    ),
  };
}

export function unpaidEmail(userName: string, poolName: string, entries: string[], fee: string, unsubscribe: string) {
  return {
    subject: `💰 Entry fee reminder: ${poolName}`,
    html: layout(
      "Entry fee reminder",
      `<p>Hi ${escapeHtml(userName)},</p>
       <p>${entries.length === 1 ? "This entry is" : "These entries are"} still unpaid (${escapeHtml(fee)} each):</p>
       <ul>${entries.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul>
       <p>Paid already? Tell us on the payment page and the admin will confirm it.</p>
       ${button(`${APP_URL}/payment`, "Pay or report a payment")}`,
      unsubscribe
    ),
  };
}

export function tipoffEmail(userName: string, team: string, opponent: string, start: Date, network: string | null, unsubscribe: string) {
  return {
    subject: `🏀 ${team} tips off soon`,
    html: layout(
      `${team} tips off soon`,
      `<p>Hi ${escapeHtml(userName)},</p>
       <p><strong>${escapeHtml(team)}</strong> plays <strong>${escapeHtml(opponent)}</strong> at ${formatEastern(start)}${network ? ` on ${escapeHtml(network)}` : ""}.</p>
       ${button(`${APP_URL}/game-center`, "Open Game Center")}`,
      unsubscribe
    ),
  };
}

export interface RecapLine {
  entryName: string;
  rank: number;
  total: number;
  yesterday: number;
}

export function dailyRecapEmail(userName: string, poolName: string, lines: RecapLine[], entries: number, gamesToday: number, unsubscribe: string) {
  const rows = lines
    .map(
      (l) => `<tr><td style="padding:6px 0">${escapeHtml(l.entryName)}</td><td style="padding:6px 12px;text-align:right"><strong>#${l.rank}</strong> of ${entries}</td>
        <td style="padding:6px 0;text-align:right">${l.total} pts <span style="color:${l.yesterday > 0 ? "#16a34a" : "#999"}">(+${l.yesterday})</span></td></tr>`
    )
    .join("");
  return {
    subject: `📊 Your ${poolName} update: #${Math.min(...lines.map((l) => l.rank))} of ${entries}`,
    html: layout(
      "Your morning update",
      `<p>Hi ${escapeHtml(userName)},</p>
       <table style="width:100%;border-collapse:collapse;font-size:15px">${rows}</table>
       <p style="color:#666">${gamesToday ? `${gamesToday} game${gamesToday === 1 ? "" : "s"} today.` : "No games today."} Points in parentheses are from yesterday's games.</p>
       ${button(`${APP_URL}/game-center`, "Open Game Center")}`,
      unsubscribe
    ),
  };
}
