import { describe, expect, it } from "vitest";
import {
  dateKeyInTz,
  dateKeyToDate,
  dateToKey,
  dayBoundsInTz,
  daysInMonth,
  isDateKey,
  isMonthKey,
  monthDateKeys,
  monthRange,
  resolveTimezone,
  shiftMonth,
} from "./date";

describe("dateKeyInTz", () => {
  it("uses the user's timezone, not UTC", () => {
    // 23:30 WIB on the 25th is 16:30Z the same day
    expect(dateKeyInTz(new Date("2026-09-25T16:30:00Z"), "Asia/Jakarta")).toBe("2026-09-25");
    // 00:30 WIB on the 26th is still the 25th in UTC
    expect(dateKeyInTz(new Date("2026-09-25T17:30:00Z"), "Asia/Jakarta")).toBe("2026-09-26");
    expect(dateKeyInTz(new Date("2026-09-26T02:00:00Z"), "America/New_York")).toBe("2026-09-25");
  });
});

describe("date keys", () => {
  it("round-trips through the stored UTC-midnight value", () => {
    expect(dateKeyToDate("2026-09-25").toISOString()).toBe("2026-09-25T00:00:00.000Z");
    expect(dateToKey(dateKeyToDate("2026-02-28"))).toBe("2026-02-28");
  });

  it("rejects impossible dates", () => {
    expect(isDateKey("2026-02-30")).toBe(false);
    expect(isDateKey("2026-13-01")).toBe(false);
    expect(isDateKey("26-09-25")).toBe(false);
    expect(isDateKey("2028-02-29")).toBe(true);
    expect(() => dateKeyToDate("2026-02-30")).toThrow();
  });
});

describe("dayBoundsInTz", () => {
  it("returns the real instants of a local day", () => {
    const b = dayBoundsInTz("2026-09-25", "Asia/Jakarta");
    expect(b.start.toISOString()).toBe("2026-09-24T17:00:00.000Z");
    expect(b.end.toISOString()).toBe("2026-09-25T17:00:00.000Z");
  });

  it("handles a 23-hour day when DST starts", () => {
    const b = dayBoundsInTz("2026-03-08", "America/New_York");
    expect(b.start.toISOString()).toBe("2026-03-08T05:00:00.000Z");
    expect(b.end.toISOString()).toBe("2026-03-09T04:00:00.000Z");
  });
});

describe("months", () => {
  it("validates month keys", () => {
    expect(isMonthKey("2026-09")).toBe(true);
    expect(isMonthKey("2026-13")).toBe(false);
    expect(isMonthKey("2026-9")).toBe(false);
  });

  it("computes ranges across a year boundary", () => {
    const r = monthRange("2026-12");
    expect(r.start.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(r.end.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("shifts months across years", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("knows month lengths", () => {
    expect(daysInMonth("2028-02")).toBe(29);
    expect(daysInMonth("2026-02")).toBe(28);
    expect(monthDateKeys("2026-09")).toHaveLength(30);
    expect(monthDateKeys("2026-09").at(-1)).toBe("2026-09-30");
  });
});

it("falls back to the default timezone for invalid values", () => {
  expect(resolveTimezone("Mars/Base")).toBe("Asia/Jakarta");
  expect(resolveTimezone(null)).toBe("Asia/Jakarta");
  expect(resolveTimezone("Europe/London")).toBe("Europe/London");
});
