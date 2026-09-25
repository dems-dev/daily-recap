import { describe, expect, it } from "vitest";
import { dueOccurrences, nextOccurrence } from "./recurring";

describe("nextOccurrence", () => {
  it("steps weekly", () => {
    expect(nextOccurrence("2026-09-25", "2026-09-25", "weekly")).toBe("2026-10-02");
  });

  it("keeps the anchor day for monthly rules, clamping short months", () => {
    const anchor = "2026-01-31";
    expect(nextOccurrence(anchor, "2026-01-31", "monthly")).toBe("2026-02-28");
    expect(nextOccurrence(anchor, "2026-02-28", "monthly")).toBe("2026-03-31");
    expect(nextOccurrence(anchor, "2026-03-31", "monthly")).toBe("2026-04-30");
  });

  it("crosses the year boundary", () => {
    expect(nextOccurrence("2026-12-05", "2026-12-05", "monthly")).toBe("2027-01-05");
  });

  it("handles leap days for yearly rules", () => {
    expect(nextOccurrence("2028-02-29", "2028-02-29", "yearly")).toBe("2029-02-28");
    expect(nextOccurrence("2028-02-29", "2031-02-28", "yearly")).toBe("2032-02-29");
  });
});

describe("dueOccurrences", () => {
  it("lists every missed occurrence up to today", () => {
    expect(dueOccurrences("2026-07-01", "2026-07-01", "monthly", "2026-09-25")).toEqual({
      dates: ["2026-07-01", "2026-08-01", "2026-09-01"],
      nextDate: "2026-10-01",
    });
  });

  it("includes an occurrence that falls on today", () => {
    expect(dueOccurrences("2026-09-25", "2026-09-25", "weekly", "2026-09-25").dates).toEqual(["2026-09-25"]);
  });

  it("returns nothing for a future start", () => {
    expect(dueOccurrences("2026-10-01", "2026-10-01", "monthly", "2026-09-25")).toEqual({
      dates: [],
      nextDate: "2026-10-01",
    });
  });
});
