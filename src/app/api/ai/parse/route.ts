import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { aiAllowedFor } from "@/lib/ai/config";
import { parseDailyLog } from "@/lib/ai/parse-log";
import { rateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({ text: z.string().trim().min(3, "tooShort").max(2000, "tooLong") });

/** POST { text } → proposed entries to review. Nothing is saved. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (!(await aiAllowedFor(user))) {
      return NextResponse.json({ message: "AI is not available", code: "aiDisabled" }, { status: 403 });
    }

    const parsed = bodySchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);

    const limit = await rateLimit(`ai-parse:${user.id}`, 30, 60 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json(
        { message: "Too many requests", code: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    return NextResponse.json(await parseDailyLog(user, parsed.data.text));
  } catch (error) {
    return serverError(error);
  }
}
