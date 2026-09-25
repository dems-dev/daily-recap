import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { notFound, readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { dateKeyToDate } from "@/lib/date";
import { transactionSchema } from "@/lib/finance";

export async function PUT(req: Request, ctx: RouteContext<"/api/finance/[id]">) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await ctx.params;

    const parsed = transactionSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);

    const { date, description, ...data } = parsed.data;
    const { count } = await prisma.finance.updateMany({
      where: { id, userId: user.id },
      data: { ...data, description: description || null, date: dateKeyToDate(date) },
    });
    if (count === 0) return notFound();

    return NextResponse.json({ id });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/finance/[id]">) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await ctx.params;

    const { count } = await prisma.finance.deleteMany({ where: { id, userId: user.id } });
    if (count === 0) return notFound();

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return serverError(error);
  }
}
