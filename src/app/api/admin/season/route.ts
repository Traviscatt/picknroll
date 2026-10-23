import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { APP_URL, seasonOpenEmail, sendEmail } from "@/lib/email";
import { unsubscribeUrl } from "@/lib/unsubscribe";

// GET /api/admin/season - Pools and tournaments for starting a new season
export async function GET() {
  const { authorized, response } = await requireAdmin();
  if (!authorized) return response!;

  const [pools, tournaments] = await Promise.all([
    db.pool.findMany({
      orderBy: [{ tournament: { year: "desc" } }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        status: true,
        deadline: true,
        entryFee: true,
        tournament: { select: { year: true } },
        _count: { select: { members: true, brackets: true } },
      },
    }),
    db.tournament.findMany({
      orderBy: { year: "desc" },
      select: { id: true, year: true, name: true, startDate: true, _count: { select: { pools: true, teams: true } } },
    }),
  ]);

  return NextResponse.json({
    pools: pools.map((p) => ({ ...p, entryFee: p.entryFee.toString(), year: p.tournament.year, members: p._count.members, brackets: p._count.brackets })),
    tournaments: tournaments.map((t) => ({ id: t.id, year: t.year, name: t.name, startDate: t.startDate, pools: t._count.pools, teams: t._count.teams })),
  });
}

const startSchema = z.object({
  fromPoolId: z.string().min(1),
  tournamentId: z.string().min(1),
  name: z.string().trim().min(2).max(100),
  deadline: z.string().datetime().optional(),
  entryFee: z.number().min(0).max(10000).optional(),
  emailMembers: z.boolean(),
  closeOldPool: z.boolean(),
});

// POST /api/admin/season - Start a new season: new pool for the new tournament, same settings and members
export async function POST(request: Request) {
  const { authorized, response } = await requireAdmin();
  if (!authorized) return response!;

  const parsed = startSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const input = parsed.data;

  const [from, tournament] = await Promise.all([
    db.pool.findUnique({
      where: { id: input.fromPoolId },
      include: { tournament: { select: { year: true } }, members: { include: { user: { select: { id: true, name: true, email: true, reminderEmails: true } } } } },
    }),
    db.tournament.findUnique({ where: { id: input.tournamentId }, include: { _count: { select: { pools: true, teams: true } } } }),
  ]);
  if (!from) return NextResponse.json({ error: "That pool doesn't exist" }, { status: 404 });
  if (!tournament) return NextResponse.json({ error: "That tournament doesn't exist" }, { status: 404 });
  if (tournament.year <= from.tournament.year) return NextResponse.json({ error: `Pick a tournament after ${from.tournament.year}` }, { status: 400 });
  if (tournament._count.teams < 64) return NextResponse.json({ error: "Import this tournament's field first (Admin → Tournament)" }, { status: 400 });
  if (tournament._count.pools > 0) return NextResponse.json({ error: `The ${tournament.year} tournament already has a pool` }, { status: 409 });

  const deadline = input.deadline ? new Date(input.deadline) : tournament.startDate;
  const pool = await db.$transaction(async (tx) => {
    const created = await tx.pool.create({
      data: {
        name: input.name,
        description: from.description,
        entryFee: input.entryFee ?? from.entryFee,
        inviteCode: nanoid(8).toUpperCase(),
        deadline,
        paypalLink: from.paypalLink,
        venmoHandle: from.venmoHandle,
        tournamentId: tournament.id,
        members: { create: from.members.map((m) => ({ userId: m.userId, role: m.role })) },
      },
    });
    if (input.closeOldPool) await tx.pool.update({ where: { id: from.id }, data: { status: "CLOSED" } });
    await tx.notification.createMany({
      data: from.members.map((m) => ({
        userId: m.userId,
        type: "SEASON_OPEN",
        title: `${tournament.year} brackets are open`,
        message: `You're in ${input.name}. Picks lock ${deadline.toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" })}.`,
      })),
    });
    return created;
  });

  // Emails go out in small parallel batches (members who opted out of reminder emails are skipped)
  let emailed = 0;
  if (input.emailMembers) {
    const recipients = from.members.map((m) => m.user).filter((u) => u.reminderEmails);
    for (let i = 0; i < recipients.length; i += 10) {
      const results = await Promise.all(
        recipients.slice(i, i + 10).map((u) => {
          const { subject, html } = seasonOpenEmail(u.name || "there", input.name, deadline, unsubscribeUrl(APP_URL, u.id));
          return sendEmail({ to: u.email, subject, html });
        })
      );
      emailed += results.filter((r) => r.success).length;
    }
  }

  return NextResponse.json({ poolId: pool.id, inviteCode: pool.inviteCode, members: from.members.length, emailed });
}
