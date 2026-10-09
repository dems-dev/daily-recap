import type { analyticsSeries } from "@/lib/analytics";

/** Mood score (1-5) to the key used under the Journal.moods namespace. */
export const MOOD_KEYS = ["terrible", "bad", "okay", "good", "great"] as const;

/** A known week (Sun 6 - Sat 12 Sep 2026) to get localized weekday names. */
export const weekdayKey = (weekday: number) => `2026-09-${String(6 + weekday).padStart(2, "0")}`;

/** What the charts need: the series plus the currency for money labels. */
export type AnalyticsChartData = ReturnType<typeof analyticsSeries> & { currency: string };
