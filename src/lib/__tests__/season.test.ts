import { describe, expect, it } from "vitest";
import { formatDeadline, seasonPhase, timeLeft } from "@/lib/season";

describe("seasonPhase", () => {
  const deadline = "2027-03-18T16:15:00.000Z";
  const at = (iso: string, over: Partial<Parameters<typeof seasonPhase>[0]> = {}) =>
    seasonPhase({ now: new Date(iso), deadline, fieldReady: true, championshipFinal: false, ...over });

  it("needs a pool", () => {
    expect(at("2027-03-01T00:00:00Z", { deadline: null })).toBe("no-pool");
  });

  it("waits for the field before opening entries", () => {
    expect(at("2027-03-01T00:00:00Z", { fieldReady: false })).toBe("preseason");
  });

  it("switches from entry to tournament at the deadline", () => {
    expect(at("2027-03-18T16:14:59Z")).toBe("entry");
    expect(at("2027-03-18T16:15:00Z")).toBe("tournament");
  });

  it("is complete once the championship is final", () => {
    expect(at("2027-04-06T03:00:00Z", { championshipFinal: true })).toBe("complete");
    expect(at("2027-10-01T00:00:00Z", { championshipFinal: true, fieldReady: true })).toBe("complete");
  });
});

describe("deadline helpers", () => {
  it("formats in Eastern time", () => {
    expect(formatDeadline("2027-03-18T16:15:00.000Z")).toBe("Thu, Mar 18 · 12:15 PM ET");
  });

  it("counts down", () => {
    const now = new Date("2027-03-16T10:00:00Z");
    expect(timeLeft("2027-03-18T14:30:00Z", now)).toBe("2 days 4 hrs");
    expect(timeLeft("2027-03-16T13:12:00Z", now)).toBe("3 hrs 12 min");
    expect(timeLeft("2027-03-16T10:00:20Z", now)).toBe("1 min");
    expect(timeLeft("2027-03-16T09:00:00Z", now)).toBeNull();
  });
});
