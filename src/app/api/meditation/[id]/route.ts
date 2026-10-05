import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { notFound, readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { dateKeyToDate } from "@/lib/date";
import { meditationPatchSchema } from "@/lib/meditation";

/** PATCH /api/meditation/[id] — correct a logged meditation session. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;

    const parsed = meditationPatchSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);

    const { date, ...rest } = parsed.data;
    const { count } = await prisma.meditationLog.updateMany({
      where: { id, userId: user.id },
      data: {
        ...rest,
        ...(date !== undefined && { date: dateKeyToDate(date) }),
      },
    });
    if (count === 0) return notFound();

    return NextResponse.json({ id });
  } catch (error) {
    return serverError(error);
  }
}

/** DELETE /api/meditation/[id] — remove a logged meditation session. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;

    const { count } = await prisma.meditationLog.deleteMany({ where: { id, userId: user.id } });
    if (count === 0) return notFound();

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return serverError(error);
  }
}
