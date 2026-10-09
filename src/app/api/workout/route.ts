import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { workoutSchema, serializeWorkout } from "@/lib/workout";
import { replaceExercises } from "@/lib/workout-records";
import { dateKeyToDate } from "@/lib/date";

/** Exercises of a session, in the order they were logged. */
const WITH_EXERCISES = { exercises: { orderBy: { order: "asc" } } } as const;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 100);

  const logs = await prisma.workout.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    take: limit,
    include: WITH_EXERCISES,
  });

  return NextResponse.json({ logs: logs.map(serializeWorkout) });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });
  const userId = session.user.id;

  try {
    const json = await req.json();
    const data = workoutSchema.parse(json);

    const created = await prisma.workout.create({
      data: {
        userId,
        name: data.name,
        type: data.type,
        duration: data.duration,
        notes: data.notes,
        date: dateKeyToDate(data.date),
      },
    });

    const newRecords = data.exercises?.length
      ? await replaceExercises(userId, created.id, data.exercises)
      : [];

    const log = await prisma.workout.findUniqueOrThrow({
      where: { id: created.id },
      include: WITH_EXERCISES,
    });

    return NextResponse.json({ ...serializeWorkout(log), newRecords });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
