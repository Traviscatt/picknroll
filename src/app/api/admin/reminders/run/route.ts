import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { runReminders } from "@/lib/reminders";

// POST /api/admin/reminders/run {"dryRun": true} - Check what's due now (dry run) or send it now
export async function POST(request: Request) {
  const { authorized, response } = await requireAdmin();
  if (!authorized) return response!;
  const { dryRun = true } = await request.json().catch(() => ({}));
  return NextResponse.json(await runReminders({ dryRun: dryRun !== false }));
}
