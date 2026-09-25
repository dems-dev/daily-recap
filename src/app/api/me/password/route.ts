import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { notFound, readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { passwordChangeSchema } from "@/lib/settings";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const current = await getCurrentUser();
    if (!current) return unauthorized();
    if (!rateLimit(`password-change:${current.id}`, 5, 15 * 60 * 1000).ok) {
      return NextResponse.json({ message: "Too many attempts", code: "rate_limited" }, { status: 429 });
    }

    const parsed = passwordChangeSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);

    const user = await prisma.user.findUnique({ where: { id: current.id }, select: { password: true } });
    if (!user) return notFound();
    if (!(await bcrypt.compare(parsed.data.currentPassword, user.password))) {
      return NextResponse.json({ message: "Wrong password", code: "wrongPassword" }, { status: 403 });
    }

    await prisma.user.update({
      where: { id: current.id },
      data: { password: await bcrypt.hash(parsed.data.newPassword, 10) },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
