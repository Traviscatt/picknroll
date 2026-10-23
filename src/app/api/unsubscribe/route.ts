import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyUnsubscribe } from "@/lib/unsubscribe";

const page = (title: string, body: string) =>
  new NextResponse(
    `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="font-family:system-ui,sans-serif;max-width:480px;margin:64px auto;padding:0 16px;color:#1a1a2e">
<h1 style="font-size:22px">${title}</h1><p>${body}</p><p><a href="/settings" style="color:#29503c">Email settings</a></p></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );

// GET /api/unsubscribe?u=<userId>&t=<token> - One-click opt-out from reminder emails
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const userId = params.get("u") ?? "";
  const token = params.get("t") ?? "";
  if (!userId || !verifyUnsubscribe(userId, token)) return page("Link not valid", "This unsubscribe link isn't valid. You can change emails in Settings.");
  await db.user.update({ where: { id: userId }, data: { reminderEmails: false, tipoffEmails: false } }).catch(() => null);
  return page("You're unsubscribed", "You won't get reminder or recap emails anymore. Account emails (like password resets) still arrive.");
}
