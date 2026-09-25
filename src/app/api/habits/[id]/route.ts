import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { notFound, readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { habitPatchSchema } from "@/lib/habits";

/** Rename, change icon, or archive/restore ({ isActive }). */
export async function PATCH(req: Request, ctx: RouteContext<"/api/habits/[id]">) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await ctx.params;

    const parsed = habitPatchSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);
    const { icon, ...rest } = parsed.data;

    const { count } = await prisma.habit.updateMany({
      where: { id, userId: user.id },
      data: { ...rest, ...(icon !== undefined && { icon: icon || null }) },
    });
    if (count === 0) return notFound();

    return NextResponse.json({ id });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/habits/[id]">) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await ctx.params;

    const { count } = await prisma.habit.deleteMany({ where: { id, userId: user.id } });
    if (count === 0) return notFound();

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return serverError(error);
  }
}
