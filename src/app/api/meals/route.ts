import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { dateKeyToDate, todayKey } from "@/lib/date";
import { mealSchema, serializeMeal } from "@/lib/meals";

/** GET /api/meals?date=YYYY-MM-DD — meals logged for a date (default today). */
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const today = todayKey(user.timezone);
    const dateParam = new URL(req.url).searchParams.get("date") ?? today;
    const date = dateKeyToDate(dateParam);

    const meals = await prisma.meal.findMany({
      where: { userId: user.id, date },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ date: dateParam, meals: meals.map(serializeMeal) });
  } catch (error) {
    return serverError(error);
  }
}

/** POST /api/meals — log a meal. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const parsed = mealSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);

    const { date, type, name, calories, protein, carbs, fat, notes } = parsed.data;

    const meal = await prisma.meal.create({
      data: {
        userId: user.id,
        date: dateKeyToDate(date),
        type,
        name,
        calories: calories ?? null,
        protein: protein ?? null,
        carbs: carbs ?? null,
        fat: fat ?? null,
        notes: notes ?? null,
      },
    });

    return NextResponse.json({ id: meal.id }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
