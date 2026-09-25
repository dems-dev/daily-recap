import { describe, expect, it } from "vitest";
import { localHour, shouldRemind } from "./reminders";

const TZ = "Asia/Jakarta";
// 13:30Z = 20:30 WIB
const now = new Date("2026-09-25T13:30:00Z");
const base = { now, timeZone: TZ, reminderHour: 20, lastReminderAt: null, hasRecapToday: false };

describe("localHour", () => {
  it("converts to the user's timezone", () => {
    expect(localHour(now, TZ)).toBe(20);
    expect(localHour(new Date("2026-09-25T17:00:00Z"), TZ)).toBe(0);
  });
});

describe("shouldRemind", () => {
  it("reminds once the hour is reached and the recap is empty", () => {
    expect(shouldRemind(base)).toBe(true);
  });

  it("waits until the reminder hour", () => {
    expect(shouldRemind({ ...base, reminderHour: 21 })).toBe(false);
  });

  it("skips when today's recap exists", () => {
    expect(shouldRemind({ ...base, hasRecapToday: true })).toBe(false);
  });

  it("reminds only once per local day", () => {
    expect(shouldRemind({ ...base, lastReminderAt: new Date("2026-09-25T13:00:00Z") })).toBe(false);
    // yesterday 20:00 WIB
    expect(shouldRemind({ ...base, lastReminderAt: new Date("2026-09-24T13:00:00Z") })).toBe(true);
  });
});
