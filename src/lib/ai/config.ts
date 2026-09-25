import "server-only";
import prisma from "@/lib/prisma";
import type { CurrentUser } from "@/lib/session";

/**
 * AI runs through the Vercel AI Gateway (the AI SDK's default provider), authenticated with
 * AI_GATEWAY_API_KEY locally or the OIDC token on Vercel. Models are plain "provider/model" strings.
 */
export const AI_MODELS = {
  /** Cheap and fast: parsing free text, short summaries. */
  fast: process.env.AI_FAST_MODEL || "anthropic/claude-haiku-4.5",
  /** Better at multi-step tool use and reasoning: the data assistant and weekly coach. */
  smart: process.env.AI_SMART_MODEL || "anthropic/claude-sonnet-5",
};

/** True when the server can reach the AI Gateway. */
export function aiConfigured() {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
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
