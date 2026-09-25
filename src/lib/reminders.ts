import { dateKeyInTz } from "@/lib/date";

/** Local hour (0-23) of `now` in `timeZone`. */
export function localHour(now: Date, timeZone: string) {
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(now)
  );
}

/**
 * Send the evening reminder when the user's local time has reached their reminder hour,
 * they haven't been reminded today, and today's recap (journal mood) is still empty.
 * ">=" rather than "==" so a once-a-day cron still works — see vercel.ts.
 */
export function shouldRemind(opts: {
  now: Date;
  timeZone: string;
  reminderHour: number;
  lastReminderAt: Date | null;
  hasRecapToday: boolean;
}) {
  const { now, timeZone, reminderHour, lastReminderAt, hasRecapToday } = opts;
  if (hasRecapToday) return false;
  if (localHour(now, timeZone) < reminderHour) return false;
  if (lastReminderAt && dateKeyInTz(lastReminderAt, timeZone) === dateKeyInTz(now, timeZone)) return false;
  return true;
}
