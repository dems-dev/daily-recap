import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { goalSchema, serializeGoal } from "@/lib/goals";

/** GET /api/goals?completed=1 — list goals with milestones. */
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const showCompleted = new URL(req.url).searchParams.get("completed") === "1";

    const goals = await prisma.goal.findMany({
      where: { userId: user.id, isCompleted: showCompleted },
      orderBy: [{ createdAt: "desc" }],
      include: {
        milestones: {
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    return NextResponse.json({
      goals: goals.map(serializeGoal),
    });
  } catch (error) {
    return serverError(error);
  }
}

/** POST /api/goals — create a new goal. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const parsed = goalSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);

    const { title, description, category, type, targetDate } = parsed.data;
    const goal = await prisma.goal.create({
      data: {
        userId: user.id,
        title,
        description: description ?? null,
        category,
        type,
        targetDate: targetDate ? new Date(targetDate + "T00:00:00Z") : null,
      },
    });

    return NextResponse.json({ id: goal.id }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
