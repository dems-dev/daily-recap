import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { notFound, readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { z } from "zod";

const milestonePatchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  isCompleted: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; milestoneId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id: goalId, milestoneId } = await params;

    // Check goal ownership
    const goal = await prisma.goal.findUnique({ where: { id: goalId, userId: user.id } });
    if (!goal) return notFound();

    const parsed = milestonePatchSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);

    const { count } = await prisma.milestone.updateMany({
      where: { id: milestoneId, goalId },
      data: parsed.data,
    });
    if (count === 0) return notFound();

    return NextResponse.json({ id: milestoneId });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; milestoneId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id: goalId, milestoneId } = await params;

    const goal = await prisma.goal.findUnique({ where: { id: goalId, userId: user.id } });
    if (!goal) return notFound();

    const { count } = await prisma.milestone.deleteMany({ where: { id: milestoneId, goalId } });
    if (count === 0) return notFound();

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return serverError(error);
  }
}
