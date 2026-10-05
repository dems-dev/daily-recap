import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { addDays, dateKeyToDate, todayKey } from "@/lib/date";
import { bodyMetricSchema, serializeBodyMetric } from "@/lib/body-metrics";

/** GET /api/body?days=30 — list body metrics for the last N days. */
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const days = Math.min(Number(new URL(req.url).searchParams.get("days") ?? 30), 365);
    const today = todayKey(user.timezone);
    const start = addDays(today, -(days - 1));

    const metrics = await prisma.bodyMetric.findMany({
      where: {
        userId: user.id,
        date: { gte: dateKeyToDate(start), lte: dateKeyToDate(today) },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({
      days,
      start,
      today,
      metrics: metrics.map(serializeBodyMetric),
    });
  } catch (error) {
    return serverError(error);
  }
}

/** POST /api/body — log body metrics for a date. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const parsed = bodyMetricSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);

    const { date, weight, bodyFat, height, notes } = parsed.data;

    const metric = await prisma.bodyMetric.upsert({
      where: { userId_date: { userId: user.id, date: dateKeyToDate(date) } },
      create: {
        userId: user.id,
        date: dateKeyToDate(date),
        weight: weight ?? null,
        bodyFat: bodyFat ?? null,
        height: height ?? null,
        notes: notes ?? null,
      },
      update: {
        ...(weight !== undefined && { weight: weight ?? null }),
        ...(bodyFat !== undefined && { bodyFat: bodyFat ?? null }),
        ...(height !== undefined && { height: height ?? null }),
        ...(notes !== undefined && { notes: notes ?? null }),
      },
    });

    return NextResponse.json({ id: metric.id }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
