import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { badRequest, readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { isDateKey, todayKey } from "@/lib/date";
import { aiAllowedFor } from "@/lib/ai/config";
import { coachWeek } from "@/lib/ai/coach";
import { rateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({ date: z.string().refine(isDateKey, "invalidDate") });

/** POST { date } → review of that week + 3 suggested priorities for the next. Nothing is saved. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (!(await aiAllowedFor(user))) {
      return NextResponse.json({ message: "AI is not available", code: "aiDisabled" }, { status: 403 });
    }

    const parsed = bodySchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);
    if (parsed.data.date > todayKey(user.timezone)) return badRequest("Cannot review a future week");

    const limit = rateLimit(`ai-coach:${user.id}`, 10, 60 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json({ message: "Too many requests", code: "rate_limited" }, { status: 429 });
    }

    return NextResponse.json(await coachWeek(user, parsed.data.date));
  } catch (error) {
    return serverError(error);
  }
}
