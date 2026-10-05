import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { badRequest, readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { isDateKey, todayKey } from "@/lib/date";
import { PERIODS } from "@/lib/recap";
import { buildRecap } from "@/lib/recap-server";
import { summarizeRecap } from "@/lib/ai/summary";
import { aiAllowedFor } from "@/lib/ai/config";
import { rateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({ period: z.enum(PERIODS), date: z.string().refine(isDateKey) });

/** POST { period, date } → { summary } — written by the AI Gateway from the recap data. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (!(await aiAllowedFor(user))) {
      return NextResponse.json({ message: "AI is not available", code: "aiDisabled" }, { status: 403 });
    }

    const parsed = bodySchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);
    const { period, date } = parsed.data;

    const today = todayKey(user.timezone);
    if (date > today) return badRequest("Cannot summarize the future");

    const limit = await rateLimit(`ai-summary:${user.id}`, 10, 60 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json(
        { message: "Too many summaries, try again later", code: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const recap = await buildRecap(user, period, date, today);
    const summary = await summarizeRecap(recap, user.locale);
    return NextResponse.json({ summary });
  } catch (error) {
    return serverError(error);
  }
}
