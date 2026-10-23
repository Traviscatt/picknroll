import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { getReminderSettings, normalizeConfig, REMINDER_INFO, REMINDER_TYPES } from "@/lib/reminders";

// GET /api/admin/reminders - Each reminder type: on/off, timing, and how many were sent
export async function GET() {
  const { authorized, response } = await requireAdmin();
  if (!authorized) return response!;
  const settings = await getReminderSettings();
  const counts = await Promise.all(REMINDER_TYPES.map((t) => db.reminderSend.count({ where: { key: { startsWith: `${t === "DAILY_RECAP" ? "RECAP" : t}:` } } })));
  return NextResponse.json(settings.map((s, i) => ({ ...s, ...REMINDER_INFO[s.type], sent: counts[i] })));
}

const updateSchema = z.object({ type: z.enum(REMINDER_TYPES), enabled: z.boolean(), config: z.record(z.string(), z.unknown()) });

// PUT /api/admin/reminders - Turn a reminder on/off and set its timing
export async function PUT(request: Request) {
  const { authorized, response } = await requireAdmin();
  if (!authorized) return response!;
  const parsed = updateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid reminder settings" }, { status: 400 });
  const { type, enabled } = parsed.data;
  const config = normalizeConfig(type, parsed.data.config) as unknown as Prisma.InputJsonValue;
  const row = await db.reminderSetting.upsert({ where: { type }, create: { type, enabled, config }, update: { enabled, config } });
  return NextResponse.json({ type: row.type, enabled: row.enabled, config: row.config });
}
