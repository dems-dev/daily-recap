import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { badRequest, notFound, readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { dateKeyToDate, isDateKey, todayKey } from "@/lib/date";
import { journalSchema, serializeJournal } from "@/lib/journal";

export async function GET(_req: Request, ctx: RouteContext<"/api/journal/[date]">) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { date } = await ctx.params;
    if (!isDateKey(date)) return badRequest("Invalid date");

    const entry = await prisma.journal.findUnique({
      where: { userId_date: { userId: user.id, date: dateKeyToDate(date) } },
    });
    return NextResponse.json({ date, today: todayKey(user.timezone), entry: entry ? serializeJournal(entry) : null });
  } catch (error) {
    return serverError(error);
  }
}

/** Create or replace the entry for a day. */
export async function PUT(req: Request, ctx: RouteContext<"/api/journal/[date]">) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { date } = await ctx.params;
    if (!isDateKey(date)) return badRequest("Invalid date");
    if (date > todayKey(user.timezone)) return badRequest("Cannot write a future day");

    const parsed = journalSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);
    const { mood, title, content, gratitude, tags } = parsed.data;

    const data = {
      mood,
      title: title || null,
      content,
      gratitude: JSON.stringify(gratitude.filter(Boolean)),
      tags: JSON.stringify([...new Set(tags)]),
    };
    const day = dateKeyToDate(date);
    const entry = await prisma.journal.upsert({
      where: { userId_date: { userId: user.id, date: day } },
      update: data,
      create: { ...data, userId: user.id, date: day },
    });

    return NextResponse.json(serializeJournal(entry));
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/journal/[date]">) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { date } = await ctx.params;
    if (!isDateKey(date)) return badRequest("Invalid date");

    const { count } = await prisma.journal.deleteMany({ where: { userId: user.id, date: dateKeyToDate(date) } });
    if (count === 0) return notFound();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return serverError(error);
  }
}
