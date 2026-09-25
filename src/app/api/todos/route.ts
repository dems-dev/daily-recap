import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { badRequest, readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { dateKeyToDate, dayBoundsInTz, todayKey } from "@/lib/date";
import { compareTodos, serializeTodo, todayTodosWhere, todoSchema, TODO_VIEWS, type TodoView } from "@/lib/todos";

/** GET /api/todos?view=today|upcoming|completed|all */
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const view = (new URL(req.url).searchParams.get("view") ?? "today") as TodoView;
    if (!TODO_VIEWS.includes(view)) return badRequest("Invalid view");

    const today = todayKey(user.timezone);
    const todayDate = dateKeyToDate(today);

    const where: Record<TodoView, Prisma.TodoWhereInput> = {
      today: todayTodosWhere(user.id, todayDate, dayBoundsInTz(today, user.timezone)),
      upcoming: { userId: user.id, isCompleted: false, dueDate: { gt: todayDate } },
      completed: { userId: user.id, isCompleted: true },
      all: { userId: user.id },
    };

    const rows = await prisma.todo.findMany({
      where: where[view],
      orderBy: view === "completed" ? { completedAt: "desc" } : { createdAt: "desc" },
      take: view === "completed" || view === "all" ? 200 : undefined,
    });

    const todos = rows.map(serializeTodo);
    if (view !== "completed") todos.sort(compareTodos);

    const [openCount, overdueCount] = await Promise.all([
      prisma.todo.count({ where: { userId: user.id, isCompleted: false } }),
      prisma.todo.count({ where: { userId: user.id, isCompleted: false, dueDate: { lt: todayDate } } }),
    ]);

    return NextResponse.json({ view, today, todos, counts: { open: openCount, overdue: overdueCount } });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const parsed = todoSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);
    const { dueDate, ...data } = parsed.data;

    const todo = await prisma.todo.create({
      data: {
        ...data,
        description: data.description || null,
        dueDate: dueDate ? dateKeyToDate(dueDate) : null,
        userId: user.id,
      },
    });

    return NextResponse.json(serializeTodo(todo), { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
