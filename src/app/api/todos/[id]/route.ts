import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { notFound, readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { dateKeyToDate } from "@/lib/date";
import { serializeTodo, todoPatchSchema } from "@/lib/todos";

/** Edit fields and/or toggle completion. */
export async function PATCH(req: Request, ctx: RouteContext<"/api/todos/[id]">) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await ctx.params;

    const existing = await prisma.todo.findFirst({ where: { id, userId: user.id } });
    if (!existing) return notFound();

    const parsed = todoPatchSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);
    const { dueDate, isCompleted, description, ...rest } = parsed.data;

    const todo = await prisma.todo.update({
      where: { id },
      data: {
        ...rest,
        ...(description !== undefined && { description: description || null }),
        ...(dueDate !== undefined && { dueDate: dueDate ? dateKeyToDate(dueDate) : null }),
        ...(isCompleted !== undefined &&
          isCompleted !== existing.isCompleted && {
            isCompleted,
            completedAt: isCompleted ? new Date() : null,
          }),
      },
    });

    return NextResponse.json(serializeTodo(todo));
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/todos/[id]">) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await ctx.params;

    const { count } = await prisma.todo.deleteMany({ where: { id, userId: user.id } });
    if (count === 0) return notFound();

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return serverError(error);
  }
}
