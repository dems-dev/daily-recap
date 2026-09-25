import { z } from "zod";
import { addDays, type DateKey } from "@/lib/date";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/finance";
import { MOODS } from "@/lib/journal";
import { matchHabit, type QuickAdd } from "@/lib/quick-add";
import { isLocalTime } from "@/lib/sleep";

/**
 * What the model returns when turning a free-text description of the day into entries.
 * Deliberately small and relative ("daysAgo") so the model never has to do date maths;
 * `toQuickAdds` then validates everything against the app's own rules.
 */
const money = {
  amount: z.number().describe("Positive amount in the user's currency, e.g. 45000 for '45rb'"),
  category: z.string().describe("One of the allowed category keys"),
  description: z.string().describe("Short note in the user's words, e.g. 'makan siang sama tim'"),
  daysAgo: z.number().int().describe("0 = today, 1 = yesterday"),
};

export const aiLogSchema = z.object({
  entries: z
    .array(
      z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("expense"), ...money }),
        z.object({ kind: z.literal("income"), ...money }),
        z.object({
          kind: z.literal("todo"),
          title: z.string(),
          dueInDays: z.number().int().nullable().describe("null when no date was mentioned, 0 = today, 1 = tomorrow"),
        }),
        z.object({ kind: z.literal("habit"), habitName: z.string().describe("Exact name from the user's habit list") }),
        z.object({
          kind: z.literal("sleep"),
          bedtime: z.string().describe("HH:MM, 24h"),
          wakeTime: z.string().describe("HH:MM, 24h"),
        }),
        z.object({
          kind: z.literal("mood"),
          mood: z.enum(MOODS),
          note: z.string().describe("Short reflection in the user's own words, can be empty"),
        }),
        z.object({ kind: z.literal("wish"), name: z.string(), price: z.number(), category: z.string() }),
        z.object({ kind: z.literal("priority"), title: z.string().describe("A goal for this week") }),
      ])
    )
    .describe("One entry per distinct thing to log, in the order mentioned"),
  notUnderstood: z.array(z.string()).describe("Parts of the text that could not be turned into an entry"),
});
export type AiLog = z.infer<typeof aiLogSchema>;
export type AiLogEntry = AiLog["entries"][number];

export type Rejected = { entry: AiLogEntry; reason: string };

/** Validate model output and turn it into the same commands the quick-add palette runs. */
export function toQuickAdds(log: AiLog, ctx: { today: DateKey; habits: { name: string }[] }) {
  const items: QuickAdd[] = [];
  const rejected: Rejected[] = [];
  const reject = (entry: AiLogEntry, reason: string) => rejected.push({ entry, reason });
  const validAmount = (n: number) => Number.isFinite(n) && n > 0 && n <= 1_000_000_000_000;

  for (const entry of log.entries.slice(0, 20)) {
    switch (entry.kind) {
      case "expense":
      case "income": {
        const categories: readonly string[] = entry.kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
        if (!validAmount(entry.amount)) reject(entry, "invalidAmount");
        else if (entry.daysAgo < 0 || entry.daysAgo > 7) reject(entry, "invalidDate");
        else
          items.push({
            kind: entry.kind,
            amount: Math.round(entry.amount * 100) / 100,
            category: categories.includes(entry.category) ? entry.category : entry.kind === "income" ? "other-income" : "other-expense",
            description: entry.description.trim().slice(0, 200),
            date: addDays(ctx.today, -entry.daysAgo),
          });
        break;
      }
      case "todo": {
        const title = entry.title.trim().slice(0, 200);
        if (!title) reject(entry, "empty");
        else if (entry.dueInDays !== null && (entry.dueInDays < 0 || entry.dueInDays > 365)) reject(entry, "invalidDate");
        else items.push({ kind: "todo", title, dueDate: entry.dueInDays === null ? null : addDays(ctx.today, entry.dueInDays) });
        break;
      }
      case "habit": {
        const match = matchHabit(ctx.habits, entry.habitName);
        if (!match) reject(entry, "unknownHabit");
        else items.push({ kind: "habit", query: match.name });
        break;
      }
      case "sleep":
        if (!isLocalTime(entry.bedtime) || !isLocalTime(entry.wakeTime)) reject(entry, "invalidTime");
        else items.push({ kind: "sleep", bedtime: entry.bedtime, wakeTime: entry.wakeTime });
        break;
      case "mood":
        items.push({ kind: "mood", mood: entry.mood, note: entry.note.trim().slice(0, 2000) });
        break;
      case "wish": {
        const name = entry.name.trim().slice(0, 120);
        if (!name) reject(entry, "empty");
        else if (!validAmount(entry.price)) reject(entry, "invalidAmount");
        else
          items.push({
            kind: "wish",
            name,
            price: entry.price,
            category: (EXPENSE_CATEGORIES as readonly string[]).includes(entry.category) ? entry.category : "shopping",
          });
        break;
      }
      case "priority": {
        const title = entry.title.trim().slice(0, 120);
        if (!title) reject(entry, "empty");
        else items.push({ kind: "priority", title });
        break;
      }
    }
  }

  // Only one mood and one sleep per day make sense; keep the last mentioned.
  for (const kind of ["mood", "sleep"] as const) {
    const idx = items.map((i, n) => (i.kind === kind ? n : -1)).filter((n) => n >= 0);
    for (const n of idx.slice(0, -1).reverse()) items.splice(n, 1);
  }

  return { items, rejected };
}
