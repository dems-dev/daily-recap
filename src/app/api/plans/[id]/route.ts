import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { notFound, readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { priorityPatchSchema } from "@/lib/plans";

export async function PATCH(req: Request, ctx: RouteContext<"/api/plans/[id]">) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await ctx.params;

    const parsed = priorityPatchSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);
    const { isDone, title } = parsed.data;

    const { count } = await prisma.weeklyPriority.updateMany({
      where: { id, userId: user.id },
      data: {
        ...(title !== undefined && { title }),
        ...(isDone !== undefined && { isDone, doneAt: isDone ? new Date() : null }),
      },
    });
    if (count === 0) return notFound();
    return NextResponse.json({ id });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/plans/[id]">) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await ctx.params;

    const { count } = await prisma.weeklyPriority.deleteMany({ where: { id, userId: user.id } });
    if (count === 0) return notFound();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return serverError(error);
  }
}
