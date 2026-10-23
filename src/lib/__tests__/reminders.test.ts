import { describe, expect, it } from "vitest";
import { dueThresholds, normalizeConfig, REMINDER_DEFAULTS } from "@/lib/reminders";
import { unsubscribeUrl, verifyUnsubscribe } from "@/lib/unsubscribe";

const H = 3_600_000;
const D = 24 * H;

describe("dueThresholds", () => {
  const lock = Date.UTC(2027, 2, 18, 16, 15);

  it("before: due inside each window, never after the event", () => {
    expect(dueThresholds(lock - 50 * H, lock, [48 * H, 3 * H], "before")).toEqual([]);
    expect(dueThresholds(lock - 47 * H, lock, [48 * H, 3 * H], "before")).toEqual([48 * H]);
    expect(dueThresholds(lock - 2 * H, lock, [48 * H, 3 * H], "before")).toEqual([48 * H, 3 * H]);
    expect(dueThresholds(lock + 1, lock, [48 * H, 3 * H], "before")).toEqual([]);
  });

  it("after: due from N days after, for a grace period", () => {
    expect(dueThresholds(lock + H, lock, [0, 7 * D], "after")).toEqual([0]);
    expect(dueThresholds(lock + 3 * D, lock, [0, 7 * D], "after")).toEqual([]); // past the 2-day grace for day 0
    expect(dueThresholds(lock + 7 * D + H, lock, [0, 7 * D], "after")).toEqual([7 * D]);
  });
});

describe("normalizeConfig", () => {
  it("keeps valid timing, sorted and de-duplicated", () => {
    expect(normalizeConfig("DEADLINE", { hoursBefore: [3, 48, 3, 24] })).toEqual({ hoursBefore: [48, 24, 3] });
    expect(normalizeConfig("UNPAID", { daysAfterLock: [7, 0] })).toEqual({ daysAfterLock: [0, 7] });
    expect(normalizeConfig("DAILY_RECAP", { hourET: 8 })).toEqual({ hourET: 8 });
  });

  it("falls back to defaults for missing or out-of-range values", () => {
    expect(normalizeConfig("DEADLINE", { hoursBefore: [-1, "x"] })).toEqual(REMINDER_DEFAULTS.DEADLINE);
    expect(normalizeConfig("TIPOFF", { minutesBefore: 1 })).toEqual(REMINDER_DEFAULTS.TIPOFF);
    expect(normalizeConfig("UNPAID", null)).toEqual(REMINDER_DEFAULTS.UNPAID);
    expect(normalizeConfig("DAILY_RECAP", { hourET: 23 })).toEqual(REMINDER_DEFAULTS.DAILY_RECAP);
  });
});

describe("unsubscribe links", () => {
  it("verify only for the same user", () => {
    const url = new URL(unsubscribeUrl("https://picknroll.net", "user-1"));
    const token = url.searchParams.get("t")!;
    expect(verifyUnsubscribe("user-1", token)).toBe(true);
    expect(verifyUnsubscribe("user-2", token)).toBe(false);
    expect(verifyUnsubscribe("user-1", "nope")).toBe(false);
  });
});
