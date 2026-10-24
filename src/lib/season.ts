// Where the member's current season stands. Pure, so Home and tests share it.

export type SeasonPhase = "no-pool" | "preseason" | "entry" | "tournament" | "complete";

export interface SeasonInput {
  now: Date;
  /** The member's current pool (null when they aren't in one) */
  deadline: Date | string | null;
  /** The pool's tournament has an imported field */
  fieldReady: boolean;
  /** The championship game is final */
  championshipFinal: boolean;
}

export function seasonPhase({ now, deadline, fieldReady, championshipFinal }: SeasonInput): SeasonPhase {
  if (!deadline) return "no-pool";
  if (championshipFinal) return "complete";
  if (!fieldReady) return "preseason";
  return now < new Date(deadline) ? "entry" : "tournament";
}

/** One of the member's entries in the current pool (GET /api/season) */
export interface SeasonEntry {
  id: string;
  name: string;
  entryName: string;
  status: string;
  paid: boolean;
  paymentPending: boolean;
  totalScore: number;
  bonusScore: number;
  picked: number;
  totalGames: number;
}

export interface SeasonPool {
  id: string;
  name: string;
  status: string;
  deadline: string;
  inviteCode: string;
  entryFee: string;
  paypalLink: string | null;
  venmoHandle: string | null;
  members: number;
  entries: number;
}

export interface SeasonResponse {
  phase: SeasonPhase;
  pool: SeasonPool | null;
  tournament: { year: number; startDate: string } | null;
  entries: SeasonEntry[];
}

/** "2027 · Smith Family Pool" (just the pool name when it already has the year) */
export const seasonLabel = (year: number | null | undefined, poolName: string) => (!year || poolName.includes(String(year)) ? poolName : `${year} · ${poolName}`);

/** What the server allows for a bracket (mirrors poolLockedReason and the DELETE rule) */
export function bracketActions(bracket: { status: string; pool?: { deadline: string | Date; status: string } | null }, now = new Date()) {
  const locked = !!bracket.pool && (bracket.pool.status !== "OPEN" || now > new Date(bracket.pool.deadline));
  return { locked, canEdit: !locked, canDelete: bracket.status === "DRAFT" || !locked };
}

/** The one thing to do next with an entry */
export function nextStep(entry: Pick<SeasonEntry, "id" | "status" | "paid" | "paymentPending" | "picked" | "totalGames">, locked: boolean) {
  if (entry.status === "DRAFT" && !locked) {
    return { label: entry.picked < entry.totalGames ? "Finish picks" : "Submit", href: `/brackets/new?editId=${entry.id}`, primary: true };
  }
  if (entry.status !== "DRAFT" && !entry.paid && !entry.paymentPending) return { label: "Pay", href: "/payment", primary: true };
  return { label: "View", href: `/brackets/${entry.id}`, primary: false };
}

/** e.g. "Thu, Mar 19 · 12:15 PM ET" */
export function formatDeadline(deadline: Date | string) {
  const d = new Date(deadline);
  const day = d.toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
  return `${day} · ${time} ET`;
}

/** "2 days 4 hrs", "3 hrs 12 min", "8 min" until `target` (null once it's passed) */
export function timeLeft(target: Date | string, now: Date): string | null {
  const ms = new Date(target).getTime() - now.getTime();
  if (ms <= 0) return null;
  const min = Math.floor(ms / 60_000);
  const days = Math.floor(min / 1440);
  const hrs = Math.floor((min % 1440) / 60);
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  if (days) return `${plural(days, "day")}${hrs ? ` ${plural(hrs, "hr")}` : ""}`;
  if (hrs) return `${plural(hrs, "hr")} ${min % 60} min`;
  return `${Math.max(1, min)} min`;
}
