import { NextResponse } from "next/server";
import { createAgentUIStreamResponse, safeValidateUIMessages } from "ai";
import { getCurrentUser } from "@/lib/session";
import { readJson, serverError, unauthorized } from "@/lib/api";
import { aiAllowedFor } from "@/lib/ai/config";
import { createDataAgent } from "@/lib/ai/data-agent";
import { rateLimit } from "@/lib/rate-limit";

const MAX_MESSAGES = 30;

/**
 * "Ask your data" chat. Streams UI messages for useChat. The conversation lives in the
 * browser only; nothing is stored on the server.
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (!(await aiAllowedFor(user))) {
      return NextResponse.json({ message: "AI is not available", code: "aiDisabled" }, { status: 403 });
    }

    const limit = await rateLimit(`ai-chat:${user.id}`, 20, 10 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json(
        { message: "Too many messages, try again in a few minutes", code: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const body = (await readJson(req)) as { messages?: unknown } | undefined;
    const agent = createDataAgent(user);
    const validated = await safeValidateUIMessages({ messages: body?.messages, tools: agent.tools });
    if (!validated.success) return NextResponse.json({ message: "Invalid messages" }, { status: 400 });

    return createAgentUIStreamResponse({
      agent,
      uiMessages: validated.data.slice(-MAX_MESSAGES),
      abortSignal: req.signal,
      onError: (error) => {
        console.error("ai chat", error);
        return "The assistant couldn't answer right now.";
      },
    });
  } catch (error) {
    return serverError(error);
  }
}
