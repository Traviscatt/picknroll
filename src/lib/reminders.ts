// Automatic reminders. Admins turn each type on/off and set its timing (ReminderSetting); a scheduled job
// calls runReminders every 10 minutes during March–April. Every send is recorded (ReminderSend) first,
// so a reminder goes out at most once even if runs overlap.
import { db } from "@/lib/db";
import {
  APP_URL,
  dailyRecapEmail,
  deadlineSoonEmail,
  sendEmail,
  tipoffEmail,
  unpaidEmail,
  type RecapLine,
} from "@/lib/email";
import { fetchScoreboard } from "@/lib/espn-live";
import { easternDate, shiftDate, tournamentDays } from "@/lib/live";
import { paymentDetails } from "@/lib/payment";
import { bracketGameForSlots, parsePicksData, scoreBracket, withoutGame } from "@/lib/scoring-engine";
import { getCurrentTournament, loadTournamentResults, rankBrackets, SCORED_STATUSES } from "@/lib/scoring-service";
import { espnIdFromLogo, TEAMS, teamSlug } from "@/lib/team-colors";
import { loadField } from "@/lib/tournament-service";
import { unsubscribeUrl } from "@/lib/unsubscribe";

export const REMINDER_TYPES = ["DEADLINE", "UNPAID", "TIPOFF", "DAILY_RECAP"] as const;
export type ReminderType = (typeof REMINDER_TYPES)[number];

export interface ReminderConfigs {
  DEADLINE: { hoursBefore: number[] };
  UNPAID: { daysAfterLock: number[] };
  TIPOFF: { minutesBefore: number };
  DAILY_RECAP: { hourET: number };
}

export const REMINDER_DEFAULTS: ReminderConfigs = {
  DEADLINE: { hoursBefore: [48, 3] },
  UNPAID: { daysAfterLock: [0, 7] },
  TIPOFF: { minutesBefore: 30 },
  DAILY_RECAP: { hourET: 9 },
};

export const REMINDER_INFO: Record<ReminderType, { label: string; description: string }> = {
  DEADLINE: { label: "Deadline reminders", description: "Email + in-app note before picks lock, to members who haven't submitted a bracket." },
  UNPAID: { label: "Unpaid entry reminders", description: "Email + in-app note after picks lock, to members with unpaid entries (skips payments waiting for confirmation)." },
  TIPOFF: { label: "Your team tips off", description: "In-app note before a member's favorite team plays. Email only for members who opt in under Settings." },
  DAILY_RECAP: { label: "Daily recap", description: "Morning email after each game day: rank, total, and points from yesterday's games." },
};

export interface ReminderSettingView<T extends ReminderType = ReminderType> {
  type: T;
  enabled: boolean;
  config: ReminderConfigs[T];
}

// Hours before lock read naturally largest first (48, 3); days after lock smallest first (0, 7)
const clampList = (list: unknown, min: number, max: number, fallback: number[], order: "desc" | "asc" = "desc") => {
  const nums = Array.isArray(list) ? list.map((v) => Math.round(Number(v))).filter((n) => Number.isFinite(n) && n >= min && n <= max) : [];
  return nums.length ? [...new Set(nums)].sort((a, b) => (order === "desc" ? b - a : a - b)).slice(0, 6) : fallback;
};

/** Sanitized config (unknown or out-of-range values fall back to defaults) */
export function normalizeConfig<T extends ReminderType>(type: T, raw: unknown): ReminderConfigs[T] {
  const r = (raw ?? {}) as Record<string, unknown>;
  const n = (v: unknown, min: number, max: number, d: number) => (Number.isFinite(Number(v)) && Number(v) >= min && Number(v) <= max ? Math.round(Number(v)) : d);
  const configs: ReminderConfigs = {
    DEADLINE: { hoursBefore: clampList(r.hoursBefore, 1, 24 * 14, REMINDER_DEFAULTS.DEADLINE.hoursBefore) },
    UNPAID: { daysAfterLock: clampList(r.daysAfterLock, 0, 60, REMINDER_DEFAULTS.UNPAID.daysAfterLock, "asc") },
    TIPOFF: { minutesBefore: n(r.minutesBefore, 10, 240, REMINDER_DEFAULTS.TIPOFF.minutesBefore) },
    DAILY_RECAP: { hourET: n(r.hourET, 5, 14, REMINDER_DEFAULTS.DAILY_RECAP.hourET) },
  };
  return configs[type];
}

export async function getReminderSettings(): Promise<ReminderSettingView[]> {
  const rows = await db.reminderSetting.findMany();
  return REMINDER_TYPES.map((type) => {
    const row = rows.find((r) => r.type === type);
    return { type, enabled: row?.enabled ?? false, config: normalizeConfig(type, row?.config ?? REMINDER_DEFAULTS[type]) };
  });
}

/**
 * Which "N before/after" thresholds are due at `now` for an event at `eventMs`:
 * before (deadline): due when now is within N of the event and the event hasn't happened.
 * after (unpaid): due from N after the event, for `graceMs` (so a late first run doesn't send stale ones).
 * Returns the due thresholds; callers send once for the most relevant and record all as sent.
 */
export function dueThresholds(nowMs: number, eventMs: number, thresholdsMs: number[], mode: "before" | "after", graceMs = 2 * 86_400_000): number[] {
  return thresholdsMs.filter((t) =>
    mode === "before" ? nowMs >= eventMs - t && nowMs < eventMs : nowMs >= eventMs + t && nowMs < eventMs + t + graceMs
  );
}

/** Records a send; false if it was already sent (at-most-once) */
async function claim(key: string, dryRun: boolean): Promise<boolean> {
  if (dryRun) return !(await db.reminderSend.findUnique({ where: { key } }));
  try {
    await db.reminderSend.create({ data: { key } });
    return true;
  } catch {
    return false;
  }
}

async function claimAll(keys: string[], dryRun: boolean) {
  const results = await Promise.all(keys.map((k) => claim(k, dryRun)));
  return results.some(Boolean);
}

export interface RunSummary {
  type: ReminderType;
  enabled: boolean;
  recipients: number;
  emailed: number;
}

interface Recipient {
  id: string;
  name: string;
  email: string;
  reminderEmails: boolean;
  tipoffEmails: boolean;
}

async function deliver(
  user: Recipient,
  wantsEmail: boolean,
  note: { type: string; title: string; message: string } | null,
  email: (unsubscribe: string) => { subject: string; html: string },
  dryRun: boolean
) {
  if (dryRun) return wantsEmail;
  if (note) await db.notification.create({ data: { userId: user.id, ...note } });
  if (!wantsEmail) return false;
  const { subject, html } = email(unsubscribeUrl(APP_URL, user.id));
  return (await sendEmail({ to: user.email, subject, html })).success;
}

const userSelect = { id: true, name: true, email: true, reminderEmails: true, tipoffEmails: true } as const;

async function runDeadline(cfg: ReminderConfigs["DEADLINE"], now: Date, dryRun: boolean) {
  let recipients = 0;
  let emailed = 0;
  const pools = await db.pool.findMany({
    where: { status: "OPEN", deadline: { gt: now } },
    include: { members: { include: { user: { select: userSelect } } } },
  });
  for (const pool of pools) {
    const due = dueThresholds(now.getTime(), pool.deadline.getTime(), cfg.hoursBefore.map((h) => h * 3_600_000), "before");
    if (!due.length) continue;
    const submitted = new Set(
      (await db.bracket.findMany({ where: { poolId: pool.id, status: { in: SCORED_STATUSES } }, select: { userId: true } })).map((b) => b.userId)
    );
    const drafts = new Set((await db.bracket.findMany({ where: { poolId: pool.id, status: "DRAFT" }, select: { userId: true } })).map((b) => b.userId));
    for (const { user } of pool.members) {
      if (submitted.has(user.id)) continue;
      if (!(await claimAll(due.map((t) => `DEADLINE:${pool.id}:${t / 3_600_000}:${user.id}`), dryRun))) continue;
      recipients++;
      const hasDrafts = drafts.has(user.id);
      const sent = await deliver(
        user,
        user.reminderEmails,
        { type: "DEADLINE_REMINDER", title: "Picks lock soon", message: `${pool.name} locks ${pool.deadline.toLocaleString("en-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "2-digit" })} ET. ${hasDrafts ? "Submit your draft so it counts." : "You haven't submitted a bracket yet."}` },
        (u) => deadlineSoonEmail(user.name || "there", pool.name, pool.deadline, hasDrafts, u),
        dryRun
      );
      if (sent) emailed++;
    }
  }
  return { recipients, emailed };
}

async function runUnpaid(cfg: ReminderConfigs["UNPAID"], now: Date, dryRun: boolean) {
  let recipients = 0;
  let emailed = 0;
  const pools = await db.pool.findMany({ where: { deadline: { lte: now, gt: new Date(now.getTime() - 70 * 86_400_000) } } });
  for (const pool of pools) {
    const due = dueThresholds(now.getTime(), pool.deadline.getTime(), cfg.daysAfterLock.map((d) => d * 86_400_000), "after");
    if (!due.length) continue;
    const unpaid = await db.bracket.findMany({
      where: { poolId: pool.id, status: "SUBMITTED", paid: false, payments: { none: { status: "PENDING" } } },
      select: { entryName: true, user: { select: userSelect } },
    });
    const byUser = new Map<string, { user: Recipient; entries: string[] }>();
    for (const b of unpaid) {
      const e = byUser.get(b.user.id) ?? { user: b.user, entries: [] };
      e.entries.push(b.entryName);
      byUser.set(b.user.id, e);
    }
    const fee = paymentDetails({ entryFee: pool.entryFee.toString(), paypalLink: null, venmoHandle: null }).feeLabel;
    for (const { user, entries } of byUser.values()) {
      if (!(await claimAll(due.map((t) => `UNPAID:${pool.id}:${t / 86_400_000}:${user.id}`), dryRun))) continue;
      recipients++;
      const sent = await deliver(
        user,
        user.reminderEmails,
        { type: "PAYMENT_REMINDER", title: "Entry fee reminder", message: `${entries.join(", ")} ${entries.length === 1 ? "is" : "are"} unpaid (${fee} each).` },
        (u) => unpaidEmail(user.name || "there", pool.name, entries, fee, u),
        dryRun
      );
      if (sent) emailed++;
    }
  }
  return { recipients, emailed };
}

/** Favorite-team slug for each ESPN team ID (curated slugs first, then the imported field's) */
async function slugsByEspnId() {
  const map = new Map<string, string>();
  for (const t of TEAMS) {
    const id = espnIdFromLogo(t.logo);
    if (id) map.set(id, t.slug);
  }
  const tournament = await getCurrentTournament();
  const field = tournament ? await loadField(tournament.id) : null;
  for (const t of field?.teams ?? []) {
    // Same slugs as /api/teams (school name; a First Four slot's name is "A / B")
    if (t.espnId && !map.has(t.espnId)) map.set(t.espnId, teamSlug(t.name.split(" / ")[0]));
    if (t.playIn?.espnId && !map.has(t.playIn.espnId)) map.set(t.playIn.espnId, teamSlug(t.playIn.name));
  }
  return map;
}

async function runTipoff(cfg: ReminderConfigs["TIPOFF"], now: Date, dryRun: boolean) {
  let recipients = 0;
  let emailed = 0;
  const events = (await fetchScoreboard(easternDate(now), 60_000)).filter((e) => {
    const until = new Date(e.date).getTime() - now.getTime();
    return e.state === "pre" && until > 0 && until <= cfg.minutesBefore * 60_000;
  });
  if (!events.length) return { recipients, emailed };
  const slugs = await slugsByEspnId();
  for (const event of events) {
    for (const [i, c] of event.competitors.entries()) {
      const slug = slugs.get(c.espnId);
      if (!slug) continue;
      const opponent = event.competitors[1 - i]?.name ?? "their opponent";
      const fans = await db.user.findMany({ where: { favoriteTeam: slug }, select: userSelect });
      for (const user of fans) {
        if (!(await claim(`TIPOFF:${event.id}:${user.id}`, dryRun))) continue;
        recipients++;
        const start = new Date(event.date);
        const sent = await deliver(
          user,
          user.tipoffEmails,
          {
            type: "TIPOFF",
            title: `${c.name} tips off soon`,
            message: `${c.name} vs ${opponent} at ${start.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" })} ET${event.network ? ` on ${event.network}` : ""}.`,
          },
          (u) => tipoffEmail(user.name || "there", c.name, opponent, start, event.network, u),
          dryRun
        );
        if (sent) emailed++;
      }
    }
  }
  return { recipients, emailed };
}

async function runRecap(cfg: ReminderConfigs["DAILY_RECAP"], now: Date, dryRun: boolean) {
  let recipients = 0;
  let emailed = 0;
  const hourET = Number(now.toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false }));
  const tournament = await getCurrentTournament();
  if (!tournament || hourET < cfg.hourET) return { recipients, emailed };
  const today = easternDate(now);
  const yesterday = shiftDate(today, -1);
  const days = tournamentDays(tournament.startDate.toISOString());
  if (!days.some((d) => d.date === yesterday)) return { recipients, emailed };

  const field = await loadField(tournament.id);
  if (!field) return { recipients, emailed };
  const espnToSlot = new Map<string, string>();
  for (const t of field.teams) {
    if (t.espnId) espnToSlot.set(t.espnId, t.id);
    if (t.playIn?.espnId) espnToSlot.set(t.playIn.espnId, t.id);
  }
  const [yesterdayEvents, todayEvents, results] = await Promise.all([
    fetchScoreboard(yesterday, 600_000),
    fetchScoreboard(today, 60_000),
    loadTournamentResults(tournament.id),
  ]);
  const yesterdayGames = yesterdayEvents.flatMap((e) => {
    const [a, b] = e.competitors.map((c) => espnToSlot.get(c.espnId));
    const gameId = e.round > 0 && a && b ? bracketGameForSlots(a, b, field.tournament.regions) : null;
    return gameId ? [gameId] : [];
  });
  const beforeYesterday = yesterdayGames.reduce((w, g) => withoutGame(w, g), results.winners);
  const total = (picksData: string | null, winners: typeof results.winners) => {
    const s = scoreBracket(parsePicksData(picksData), winners);
    return s.total + s.bonus;
  };

  const pools = await db.pool.findMany({ where: { tournamentId: tournament.id, deadline: { lt: now } } });
  for (const pool of pools) {
    const brackets = await db.bracket.findMany({
      where: { poolId: pool.id, status: { in: SCORED_STATUSES } },
      select: { id: true, entryName: true, totalScore: true, bonusScore: true, tiebreaker: true, picksData: true, user: { select: userSelect } },
    });
    const ranked = rankBrackets(brackets, results.actualTiebreaker);
    const byUser = new Map<string, { user: Recipient; lines: RecapLine[] }>();
    for (const b of ranked) {
      const entry = byUser.get(b.user.id) ?? { user: b.user, lines: [] };
      entry.lines.push({ entryName: b.entryName, rank: b.rank, total: b.score, yesterday: b.score - total(b.picksData, beforeYesterday) });
      byUser.set(b.user.id, entry);
    }
    for (const { user, lines } of byUser.values()) {
      if (!user.reminderEmails) continue;
      if (!(await claim(`RECAP:${today}:${pool.id}:${user.id}`, dryRun))) continue;
      recipients++;
      const sent = await deliver(user, true, null, (u) => dailyRecapEmail(user.name || "there", pool.name, lines, brackets.length, todayEvents.length, u), dryRun);
      if (sent) emailed++;
    }
  }
  return { recipients, emailed };
}

const RUNNERS: { [T in ReminderType]: (cfg: ReminderConfigs[T], now: Date, dryRun: boolean) => Promise<{ recipients: number; emailed: number }> } = {
  DEADLINE: runDeadline,
  UNPAID: runUnpaid,
  TIPOFF: runTipoff,
  DAILY_RECAP: runRecap,
};

/** Sends every due reminder for the enabled types. `dryRun` counts recipients without sending or recording. */
export async function runReminders({ now = new Date(), dryRun = false } = {}): Promise<RunSummary[]> {
  const settings = await getReminderSettings();
  const summaries: RunSummary[] = [];
  for (const s of settings) {
    if (!s.enabled) {
      summaries.push({ type: s.type, enabled: false, recipients: 0, emailed: 0 });
      continue;
    }
    try {
      const runner = RUNNERS[s.type] as (cfg: unknown, now: Date, dryRun: boolean) => Promise<{ recipients: number; emailed: number }>;
      summaries.push({ type: s.type, enabled: true, ...(await runner(s.config, now, dryRun)) });
    } catch (error) {
      console.error(`Reminder ${s.type} failed:`, error);
      summaries.push({ type: s.type, enabled: true, recipients: 0, emailed: 0 });
    }
  }
  return summaries;
}
