import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { serverError, unauthorized } from "@/lib/api";
import { dateKeyToDate, resolveTimezone, todayKey } from "@/lib/date";
import { pushConfigured, sendPushToUser } from "@/lib/push";
import { shouldRemind } from "@/lib/reminders";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Evening reminder. Called by Vercel Cron (see vercel.ts) with
 * "Authorization: Bearer $CRON_SECRET".
 */
export async function GET(req: Request) {
  if (!authorized(req)) return unauthorized();
  if (!pushConfigured()) return NextResponse.json({ skipped: "push not configured" });

  try {
    const now = new Date();
    const users = await prisma.user.findMany({
      where: { reminderEnabled: true, pushSubscriptions: { some: {} } },
      select: { id: true, timezone: true, locale: true, reminderHour: true, lastReminderAt: true },
    });

    let reminded = 0;
    for (const user of users) {
      const timeZone = resolveTimezone(user.timezone);
      const today = dateKeyToDate(todayKey(timeZone));
      const journal = await prisma.journal.findUnique({
        where: { userId_date: { userId: user.id, date: today } },
        select: { id: true },
      });

      if (
        !shouldRemind({
          now,
          timeZone,
          reminderHour: user.reminderHour,
          lastReminderAt: user.lastReminderAt,
          hasRecapToday: !!journal,
        })
      ) {
        continue;
      }

      const isId = user.locale !== "en";
      let title = isId ? "Waktunya recap harian ✨" : "Time for your daily recap ✨";
      let body = isId
        ? "Dua menit saja: catat mood dan refleksi hari ini."
        : "Two minutes: log your mood and a short reflection.";

      const pendingWishlistCount = await prisma.wishlistItem.count({
        where: {
          userId: user.id,
          status: "waiting",
          waitUntil: { lte: today },
        },
      });

      if (pendingWishlistCount > 0) {
        title = isId ? "Recap & Wishlist ✨" : "Recap & Wishlist ✨";
        body += isId 
          ? ` Oh ya, ada ${pendingWishlistCount} barang di wishlist yang sudah lewat 7 hari!`
          : ` Also, ${pendingWishlistCount} item(s) in your wishlist are ready to be decided!`;
      }

      const { sent } = await sendPushToUser(user.id, {
        title,
        body,
        url: "/recap",
        tag: "evening-reminder",
      });
      await prisma.user.update({ where: { id: user.id }, data: { lastReminderAt: now } });
      if (sent > 0) reminded += 1;
    }

    return NextResponse.json({ checked: users.length, reminded });
  } catch (error) {
    return serverError(error);
  }
}
