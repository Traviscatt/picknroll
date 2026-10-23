import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

// Admin-entered Hall of Fame rows (seasons before the app, or corrections to a computed year)

export async function GET() {
  const { authorized, response } = await requireAdmin();
  if (!authorized) return response!;
  return NextResponse.json(await db.hallOfFameEntry.findMany({ orderBy: [{ year: "desc" }, { place: "asc" }] }));
}

const entrySchema = z.object({
  year: z.number().int().min(1980).max(2100),
  place: z.number().int().min(1).max(3),
  name: z.string().trim().min(1).max(100),
  score: z.number().int().min(0).max(1000).nullable().optional(),
  note: z.string().trim().max(200).nullable().optional(),
});

// POST - Add or replace the entry for a year and place
export async function POST(request: Request) {
  const { authorized, response } = await requireAdmin();
  if (!authorized) return response!;
  const parsed = entrySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { year, place, ...data } = parsed.data;
  const entry = await db.hallOfFameEntry.upsert({
    where: { year_place: { year, place } },
    create: { year, place, name: data.name, score: data.score ?? null, note: data.note ?? null },
    update: { name: data.name, score: data.score ?? null, note: data.note ?? null },
  });
  return NextResponse.json(entry);
}

// DELETE ?id=...
export async function DELETE(request: Request) {
  const { authorized, response } = await requireAdmin();
  if (!authorized) return response!;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  await db.hallOfFameEntry.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
