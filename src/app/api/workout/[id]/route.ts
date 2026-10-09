import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { notFound, readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { dateKeyToDate } from "@/lib/date";
import { workoutPatchSchema } from "@/lib/workout";
import { replaceExercises } from "@/lib/workout-records";

/** PATCH /api/workout/[id] - correct a logged workout. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;

    const parsed = workoutPatchSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);

    const { date, exercises, ...rest } = parsed.data;
    const fields = {
      ...rest,
      ...(date !== undefined && { date: dateKeyToDate(date) }),
    };

    // Ownership gate for both writes below. An exercises-only edit sends no
    // session fields at all, and `updateMany` with empty data touches no rows,
    // so the check cannot be folded into it.
    const owned = await prisma.workout.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (!owned) return notFound();

    if (Object.keys(fields).length) {
      await prisma.workout.update({ where: { id }, data: fields });
    }

    const newRecords = exercises ? await replaceExercises(user.id, id, exercises) : [];

    return NextResponse.json({ id, newRecords });
  } catch (error) {
    return serverError(error);
  }
}

/** DELETE /api/workout/[id] - remove a logged workout. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;

    const { count } = await prisma.workout.deleteMany({ where: { id, userId: user.id } });
    if (count === 0) return notFound();

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return serverError(error);
  }
}
