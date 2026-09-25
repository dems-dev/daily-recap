import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { badRequest, notFound, readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { dateKeyToDate, todayKey } from "@/lib/date";
import { decisionSchema, wishlistPatchSchema } from "@/lib/wishlist";

/**
 * Decide on a waiting item: POST { decision: "bought" | "skipped" }.
 * Buying records the expense for today; skipping counts as money saved.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/wishlist/[id]">) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await ctx.params;

    const parsed = decisionSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);

    const item = await prisma.wishlistItem.findFirst({ where: { id, userId: user.id } });
    if (!item) return notFound();
    if (item.status !== "waiting") return badRequest("Already decided");

    const today = dateKeyToDate(todayKey(user.timezone));
    await prisma.$transaction(async (tx) => {
      // Only one decision wins if two requests race.
      const claimed = await tx.wishlistItem.updateMany({
        where: { id, status: "waiting" },
        data: { status: parsed.data.decision, decidedOn: today },
      });
      if (claimed.count === 0 || parsed.data.decision !== "bought") return;
      const expense = await tx.finance.create({
        data: {
          userId: user.id,
          type: "expense",
          amount: item.price,
          category: item.category,
          description: item.name,
          date: today,
        },
      });
      await tx.wishlistItem.update({ where: { id }, data: { financeId: expense.id } });
    });

    return NextResponse.json({ id, status: parsed.data.decision });
  } catch (error) {
    return serverError(error);
  }
}

/** Correct a waiting item's name, price, category, link or note. */
export async function PATCH(req: Request, ctx: RouteContext<"/api/wishlist/[id]">) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await ctx.params;

    const parsed = wishlistPatchSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);
    const { url, note, ...data } = parsed.data;

    const item = await prisma.wishlistItem.findFirst({ where: { id, userId: user.id }, select: { status: true } });
    if (!item) return notFound();
    if (item.status !== "waiting") return badRequest("Only waiting items can be edited");

    await prisma.wishlistItem.update({
      where: { id },
      data: {
        ...data,
        ...(url !== undefined && { url: url || null }),
        ...(note !== undefined && { note: note || null }),
      },
    });
    return NextResponse.json({ id });
  } catch (error) {
    return serverError(error);
  }
}

/** Remove the item (a recorded purchase stays in Finance). */
export async function DELETE(_req: Request, ctx: RouteContext<"/api/wishlist/[id]">) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await ctx.params;

    const { count } = await prisma.wishlistItem.deleteMany({ where: { id, userId: user.id } });
    if (count === 0) return notFound();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return serverError(error);
  }
}
