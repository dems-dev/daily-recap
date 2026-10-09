import { describe, expect, it } from "vitest";
import { bodyMetricSchema } from "./body-metrics";
import { bookPatchSchema, bookSchema } from "./books";
import { emptyToNull, emptyToUndefined } from "./forms";

describe("emptyToNull", () => {
  it("turns an empty input into null", () => {
    expect(emptyToNull("")).toBeNull();
    expect(emptyToNull(null)).toBeNull();
    expect(emptyToNull(undefined)).toBeNull();
    // What `valueAsNumber` produced for an empty field, and the reason for this helper.
    expect(emptyToNull(Number.NaN)).toBeNull();
    expect(emptyToNull("abc")).toBeNull();
  });

  it("keeps a real number, including a decimal one", () => {
    expect(emptyToNull(18.5)).toBe(18.5);
    expect(emptyToNull("18.5")).toBe(18.5);
    expect(emptyToNull(0)).toBe(0);
  });
});

describe("emptyToUndefined", () => {
  it("leaves the field out instead of nulling it", () => {
    expect(emptyToUndefined("")).toBeUndefined();
    expect(emptyToUndefined(Number.NaN)).toBeUndefined();
    expect(emptyToUndefined(null)).toBeUndefined();
  });

  it("keeps a real number", () => {
    expect(emptyToUndefined(120)).toBe(120);
    expect(emptyToUndefined("120")).toBe(120);
  });
});

describe("body metrics with fields left empty", () => {
  const date = "2026-10-09";

  it("accepts a weight-only entry, which is what the helper now sends", () => {
    const parsed = bodyMetricSchema.safeParse({
      date,
      weight: 70,
      bodyFat: emptyToNull(Number.NaN),
      height: emptyToNull(""),
    });
    expect(parsed.success).toBe(true);
  });

  it("rejected the raw empty input before, which is the bug this fixes", () => {
    const parsed = bodyMetricSchema.safeParse({ date, weight: 70, bodyFat: Number.NaN });
    expect(parsed.success).toBe(false);
  });

  it("still rejects an out-of-range number, with its own message", () => {
    const parsed = bodyMetricSchema.safeParse({ date, bodyFat: emptyToNull(0) });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0].message).toBe("positive");
  });

  it("still accepts an entry with nothing but a date", () => {
    expect(bodyMetricSchema.safeParse({ date }).success).toBe(true);
  });
});

describe("books with page counts left empty", () => {
  it("accepts a new book without a page count", () => {
    const parsed = bookSchema.safeParse({
      title: "Atomic Habits",
      status: "reading",
      totalPages: emptyToNull(Number.NaN),
    });
    expect(parsed.success).toBe(true);
  });

  it("leaves currentPage unset rather than nulling a non-nullable column", () => {
    const parsed = bookPatchSchema.safeParse({ currentPage: emptyToUndefined("") });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.currentPage).toBeUndefined();
    // What the PATCH body ends up as: the field is dropped, so the stored value stays.
    expect(JSON.stringify(parsed.data)).toBe("{}");
  });

  it("keeps rejecting a null currentPage, so the helper choice matters", () => {
    expect(bookPatchSchema.safeParse({ currentPage: null }).success).toBe(false);
  });

  it("still takes a real page count", () => {
    const parsed = bookPatchSchema.safeParse({ currentPage: emptyToUndefined("120") });
    expect(parsed.success && parsed.data.currentPage).toBe(120);
  });
});
