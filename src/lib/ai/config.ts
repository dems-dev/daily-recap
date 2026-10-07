import "server-only";
import { google } from "@ai-sdk/google";
import prisma from "@/lib/prisma";
import type { CurrentUser } from "@/lib/session";

/**
 * AI runs through Google's Gemini API via the AI SDK's `@ai-sdk/google` provider,
 * authenticated with GOOGLE_GENERATIVE_AI_API_KEY. The "-latest" alias tracks the current
 * Flash-Lite so a model deprecation doesn't break us. Flash-Lite has no "thinking" overhead,
 * so it stays fast (~1–2s) - important for the streaming chat agent. Override per task with
 * AI_FAST_MODEL / AI_SMART_MODEL (e.g. set AI_SMART_MODEL="gemini-3.8-flash" for stronger
 * reasoning at the cost of higher latency).
 */
export const AI_MODELS = {
  /** Cheap and fast: parsing free text, short summaries. */
  fast: google(process.env.AI_FAST_MODEL || "gemini-flash-lite-latest"),
  /** Multi-step tool use and reasoning: the data assistant and weekly coach. */
  smart: google(process.env.AI_SMART_MODEL || "gemini-flash-lite-latest"),
};

/** True when the server has a Gemini API key configured. */
export function aiConfigured() {
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}

/** Server configured AND the user hasn't turned AI off in Settings. */
export async function aiAllowedFor(user: CurrentUser) {
  if (!aiConfigured()) return false;
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { aiEnabled: true } });
  return row?.aiEnabled ?? false;
}

export function languageName(locale: string) {
  return locale === "en" ? "English" : "Bahasa Indonesia";
}
