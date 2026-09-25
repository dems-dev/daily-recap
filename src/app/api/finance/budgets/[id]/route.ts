import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { notFound, serverError, unauthorized } from "@/lib/api";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/finance/budgets/[id]">) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await ctx.params;

    const { count } = await prisma.budget.deleteMany({ where: { id, userId: user.id } });
    if (count === 0) return notFound();

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return serverError(error);
  }
}
