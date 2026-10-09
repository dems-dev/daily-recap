import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { resolveTimezone } from "@/lib/date";

export type CurrentUser = {
  id: string;
  name: string | null;
  timezone: string;
  currency: string;
  locale: string;
  weekStartDay: string;
};

/** The logged-in user with the settings API routes need, or null. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, timezone: true, currency: true, locale: true, weekStartDay: true },
  });
  if (!user) return null;

  return { ...user, timezone: resolveTimezone(user.timezone) };
}
