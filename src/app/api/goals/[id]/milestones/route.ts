import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { notFound, readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { milestoneSchema } from "@/lib/goals";

/** POST /api/goals/[id]/milestones - create a new milestone. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id: goalId } = await params;

    const goal = await prisma.goal.findUnique({
      where: { id: goalId, userId: user.id },
      select: { id: true, milestones: { select: { order: true }, orderBy: { order: "desc" }, take: 1 } },
    });
    if (!goal) return notFound();

    const parsed = milestoneSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);

    const nextOrder = (goal.milestones[0]?.order ?? -1) + 1;

    const milestone = await prisma.milestone.create({
      data: {
        goalId,
        title: parsed.data.title,
        order: nextOrder,
      },
    });

    return NextResponse.json({ id: milestone.id }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
