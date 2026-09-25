import { describe, expect, it } from "vitest";
import {
  averageBedtime,
  bedtimeSpread,
  formatDuration,
  instantToLocalTime,
  localTimeToInstant,
  sleepWindow,
} from "./sleep";

describe("localTimeToInstant", () => {
  it("converts Jakarta wall time", () => {
    expect(localTimeToInstant("2026-09-25", "06:15", "Asia/Jakarta").toISOString()).toBe("2026-09-24T23:15:00.000Z");
  });

  it("handles DST in New York", () => {
    // 8 Mar 2026: clocks jump 02:00 → 03:00 (EST -5 → EDT -4)
    expect(localTimeToInstant("2026-03-08", "07:00", "America/New_York").toISOString()).toBe("2026-03-08T11:00:00.000Z");
    expect(localTimeToInstant("2026-03-07", "23:00", "America/New_York").toISOString()).toBe("2026-03-08T04:00:00.000Z");
  });

  it("round-trips with instantToLocalTime", () => {
    const t = localTimeToInstant("2026-09-25", "23:45", "Asia/Jakarta");
    expect(instantToLocalTime(t, "Asia/Jakarta")).toBe("23:45");
  });
});

describe("sleepWindow", () => {
  it("puts a late-evening bedtime on the day before", () => {
    const w = sleepWindow("2026-09-25", "23:30", "06:15", "Asia/Jakarta");
    expect(w.duration).toBe(405);
    expect(w.bedtime.toISOString()).toBe("2026-09-24T16:30:00.000Z");
  });

  it("keeps an after-midnight bedtime on the same day", () => {
    expect(sleepWindow("2026-09-25", "01:00", "07:00", "Asia/Jakarta").duration).toBe(360);
  });

  it("counts the lost hour on a DST night", () => {
    expect(sleepWindow("2026-03-08", "23:00", "07:00", "America/New_York").duration).toBe(7 * 60);
  });
});

describe("bedtime stats", () => {
  it("treats 23:30 and 00:30 as close", () => {
    expect(averageBedtime(["23:30", "00:30"])).toBe("00:00");
    expect(bedtimeSpread(["23:30", "00:30"])).toBe(30);
  });

  it("needs two nights for a spread", () => {
    expect(bedtimeSpread(["23:00"])).toBeNull();
    expect(averageBedtime([])).toBeNull();
  });
});

it("formats durations", () => {
  expect(formatDuration(450, "id")).toBe("7j 30m");
  expect(formatDuration(480, "en")).toBe("8h");
});
