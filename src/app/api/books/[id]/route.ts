import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { notFound, readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { dateKeyToDate } from "@/lib/date";
import { bookPatchSchema } from "@/lib/books";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;

    const parsed = bookPatchSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);

    const { startDate, finishDate, ...rest } = parsed.data;
    const data: Record<string, unknown> = { ...rest };

    if (startDate !== undefined) data.startDate = startDate ? dateKeyToDate(startDate) : null;
    if (finishDate !== undefined) data.finishDate = finishDate ? dateKeyToDate(finishDate) : null;

    // Auto-set startDate when moving to reading
    if (rest.status === "reading" && !startDate) data.startDate = new Date();
    // Auto-set finishDate when finishing
    if (rest.status === "finished" && !finishDate) data.finishDate = new Date();

    const { count } = await prisma.book.updateMany({
      where: { id, userId: user.id },
      data,
    });
    if (count === 0) return notFound();

    return NextResponse.json({ id });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;

    const { count } = await prisma.book.deleteMany({ where: { id, userId: user.id } });
    if (count === 0) return notFound();

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return serverError(error);
  }
}
