import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { addDays, dateKeyToDate, dateToKey, daysBetween, todayKey } from "@/lib/date";
import { wishlistSchema } from "@/lib/wishlist";
import type { WishlistItem } from "@prisma/client";

function serialize(item: WishlistItem, today: string) {
  const waitUntil = dateToKey(item.waitUntil);
  return {
    id: item.id,
    name: item.name,
    price: item.price,
    category: item.category,
    url: item.url,
    note: item.note,
    addedOn: dateToKey(item.addedOn),
    waitUntil,
    daysLeft: Math.max(0, daysBetween(today, waitUntil)),
    status: item.status as "waiting" | "bought" | "skipped",
    decidedOn: item.decidedOn ? dateToKey(item.decidedOn) : null,
  };
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const today = todayKey(user.timezone);
    const [waiting, decided, totals] = await Promise.all([
      prisma.wishlistItem.findMany({ where: { userId: user.id, status: "waiting" }, orderBy: { waitUntil: "asc" } }),
      prisma.wishlistItem.findMany({
        where: { userId: user.id, status: { in: ["bought", "skipped"] } },
        orderBy: { decidedOn: "desc" },
        take: 30,
      }),
      prisma.wishlistItem.groupBy({ by: ["status"], where: { userId: user.id }, _sum: { price: true }, _count: true }),
    ]);

    const total = (status: string) => totals.find((t) => t.status === status);
    return NextResponse.json({
      today,
      currency: user.currency,
      waiting: waiting.map((i) => serialize(i, today)),
      decided: decided.map((i) => serialize(i, today)),
      stats: {
        waitingTotal: total("waiting")?._sum.price ?? 0,
        savedTotal: total("skipped")?._sum.price ?? 0,
        skippedCount: total("skipped")?._count ?? 0,
        boughtCount: total("bought")?._count ?? 0,
      },
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const parsed = wishlistSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);
    const { waitDays, url, note, ...data } = parsed.data;

    const today = todayKey(user.timezone);
    const item = await prisma.wishlistItem.create({
      data: {
        ...data,
        url: url || null,
        note: note || null,
        userId: user.id,
        addedOn: dateKeyToDate(today),
        waitUntil: dateKeyToDate(addDays(today, waitDays)),
      },
    });
    return NextResponse.json({ id: item.id, waitUntil: addDays(today, waitDays) }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
