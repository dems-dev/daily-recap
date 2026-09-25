import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { notFound, serverError, unauthorized } from "@/lib/api";
import { todayKey } from "@/lib/date";

/** The signed-in user's profile and settings, plus "today" in their timezone. */
export async function GET() {
  try {
    const current = await getCurrentUser();
    if (!current) return unauthorized();

    const user = await prisma.user.findUnique({
      where: { id: current.id },
      select: {
        name: true,
        email: true,
        locale: true,
        currency: true,
        timezone: true,
        weekStartDay: true,
        reminderEnabled: true,
        reminderHour: true,
        createdAt: true,
      },
    });
    if (!user) return notFound();

    return NextResponse.json({
      ...user,
      timezone: current.timezone,
      createdAt: user.createdAt.toISOString(),
      today: todayKey(current.timezone),
    });
  } catch (error) {
    return serverError(error);
  }
}
