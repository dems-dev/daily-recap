import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { notFound, readJson, serverError, unauthorized, validationError } from "@/lib/api";
import bcrypt from "bcryptjs";
import { deleteAccountSchema, settingsSchema } from "@/lib/settings";
import { rateLimit } from "@/lib/rate-limit";
import { todayKey } from "@/lib/date";
import { aiEnabled } from "@/lib/ai-summary";
import { pushConfigured } from "@/lib/push";

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
      aiEnabled: aiEnabled(),
      pushEnabled: pushConfigured(),
    });
  } catch (error) {
    return serverError(error);
  }
}

/** Update profile and preferences (any subset of fields). */
export async function PATCH(req: Request) {
  try {
    const current = await getCurrentUser();
    if (!current) return unauthorized();

    const parsed = settingsSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);

    await prisma.user.update({
      where: { id: current.id },
      data: {
        ...parsed.data,
        // Re-enabling the reminder shouldn't be blocked by one sent earlier today.
        ...(parsed.data.reminderEnabled === true && { lastReminderAt: null }),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}

/** Delete the account and all its data. Requires the password. */
export async function DELETE(req: Request) {
  try {
    const current = await getCurrentUser();
    if (!current) return unauthorized();
    if (!rateLimit(`delete-account:${current.id}`, 5, 15 * 60 * 1000).ok) {
      return NextResponse.json({ message: "Too many attempts", code: "rate_limited" }, { status: 429 });
    }

    const parsed = deleteAccountSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);

    const user = await prisma.user.findUnique({ where: { id: current.id }, select: { password: true } });
    if (!user) return notFound();
    if (!(await bcrypt.compare(parsed.data.password, user.password))) {
      return NextResponse.json({ message: "Wrong password", code: "wrongPassword" }, { status: 403 });
    }

    // Every model references User with onDelete: Cascade.
    await prisma.user.delete({ where: { id: current.id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return serverError(error);
  }
}
