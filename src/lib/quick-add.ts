import { addDays, isDateKey, type DateKey } from "@/lib/date";
import { isLocalTime } from "@/lib/sleep";
import type { Mood } from "@/lib/journal";

/**
 * Parses one-line quick-add commands (Indonesian and English):
 *
 *   -25rb kopi              expense 25.000, category guessed from "kopi" (food)
 *   +5jt gaji               income 5.000.000 (salary)
 *   -1,5jt sewa kemarin     expense dated yesterday
 *   todo beli sayur besok   task due tomorrow        (also: tugas, task, t)
 *   done minum air          check a habit for today  (also: selesai, cek, ✓)
 *   mood baik capek tapi senang   set today's mood, append a note
 *   tidur 23:30 06:15       log last night's sleep   (also: sleep)
 *   wish 350rb sepatu       add to the wait-7-days wishlist (also: ingin, mau beli)
 *   prioritas laporan Q3    add a priority for this week (also: fokus, priority)
 */
export type QuickAdd =
  | { kind: "expense" | "income"; amount: number; category: string; description: string; date: DateKey }
  | { kind: "todo"; title: string; dueDate: DateKey | null }
  | { kind: "habit"; query: string }
  | { kind: "mood"; mood: Mood; note: string }
  | { kind: "sleep"; bedtime: string; wakeTime: string }
  | { kind: "wish"; price: number; name: string; category: string }
  | { kind: "priority"; title: string };

const EXPENSE_KEYWORDS: Record<string, string[]> = {
  food: ["makan", "makanan", "kopi", "sarapan", "lunch", "dinner", "breakfast", "snack", "jajan", "minum", "resto", "gofood", "grabfood", "food", "coffee", "nasi", "bakso", "mie"],
  transport: ["bensin", "gojek", "grab", "ojek", "ojol", "parkir", "tol", "kereta", "krl", "mrt", "busway", "bus", "taksi", "taxi", "transport", "fuel", "gas"],
  shopping: ["belanja", "baju", "sepatu", "shopee", "tokopedia", "tokped", "shopping", "clothes"],
  bills: ["listrik", "pdam", "internet", "wifi", "pulsa", "kuota", "sewa", "kos", "kost", "kontrakan", "tagihan", "bpjs", "cicilan", "rent", "bill", "bills", "electricity"],
  entertainment: ["nonton", "bioskop", "netflix", "spotify", "game", "hiburan", "konser", "movie", "cinema"],
  health: ["obat", "dokter", "apotek", "klinik", "gym", "vitamin", "medicine", "doctor", "pharmacy"],
  education: ["buku", "kursus", "kuliah", "sekolah", "spp", "udemy", "course", "book", "books"],
  family: ["keluarga", "ortu", "anak", "istri", "suami", "arisan", "kondangan", "family"],
};

const INCOME_KEYWORDS: Record<string, string[]> = {
  salary: ["gaji", "salary", "bonus", "thr", "payroll"],
  freelance: ["freelance", "proyek", "project", "klien", "client", "fee"],
  business: ["jualan", "usaha", "bisnis", "omzet", "sales", "business"],
  investment: ["dividen", "bunga", "saham", "reksadana", "investasi", "dividend", "interest", "investment"],
  gift: ["hadiah", "angpao", "kado", "gift"],
};

const MOOD_WORDS: Record<string, Mood> = {
  hebat: "great", great: "great", senang: "great", bahagia: "great", mantap: "great",
  baik: "good", good: "good", oke: "good",
  biasa: "okay", okay: "okay", ok: "okay", lumayan: "okay", meh: "okay",
  kurang: "bad", bad: "bad", sedih: "bad", capek: "bad", lelah: "bad",
  buruk: "terrible", terrible: "terrible", awful: "terrible", hancur: "terrible",
};

const MULTIPLIERS: Record<string, number> = { rb: 1e3, ribu: 1e3, k: 1e3, jt: 1e6, juta: 1e6 };

/** "25rb" → 25000, "1,5jt" → 1500000, "25.000" → 25000, "12.5" → 12.5 */
export function parseAmount(number: string, suffix?: string): number | null {
  let value: number;
  if (suffix) {
    value = Number(number.replace(",", "."));
  } else if (/^\d{1,3}([.,]\d{3})+$/.test(number)) {
    value = Number(number.replace(/[.,]/g, "")); // thousand separators
  } else {
    value = Number(number.replace(",", "."));
  }
  if (!Number.isFinite(value) || value <= 0) return null;
  const amount = value * (suffix ? MULTIPLIERS[suffix.toLowerCase()] : 1);
  return Math.round(amount * 100) / 100;
}

function guessCategory(words: string[], keywords: Record<string, string[]>, fallback: string) {
  for (const word of words) {
    for (const [category, list] of Object.entries(keywords)) {
      if (list.includes(word)) return category;
    }
  }
  return fallback;
}

type DateWord = { pattern: RegExp; offset: number };
const DATE_WORDS: DateWord[] = [
  { pattern: /\b(hari ini|today)\b/i, offset: 0 },
  { pattern: /\b(kemarin|yesterday)\b/i, offset: -1 },
  { pattern: /\b(besok|tomorrow)\b/i, offset: 1 },
  { pattern: /\blusa\b/i, offset: 2 },
];

/** Pulls a relative date word out of `text`. */
function extractDate(text: string, today: DateKey) {
  for (const { pattern, offset } of DATE_WORDS) {
    if (pattern.test(text)) {
      return { date: addDays(today, offset), rest: text.replace(pattern, " ").replace(/\s+/g, " ").trim() };
    }
  }
  return { date: null, rest: text.trim() };
}

const MONEY_RE = /^([+-])\s*(\d[\d.,]*)\s*(rb|ribu|k|jt|juta)?(?=\s|$)\s*(.*)$/i;

export function parseQuickAdd(input: string, today: DateKey): QuickAdd | null {
  const text = input.trim();
  if (!text) return null;

  const money = MONEY_RE.exec(text);
  if (money) {
    const [, sign, number, suffix, rest] = money;
    const amount = parseAmount(number, suffix);
    if (amount === null) return null;
    const { date, rest: description } = extractDate(rest, today);
    const kind = sign === "+" ? "income" : "expense";
    const words = description.toLowerCase().split(/\s+/);
    const category =
      kind === "income"
        ? guessCategory(words, INCOME_KEYWORDS, "other-income")
        : guessCategory(words, EXPENSE_KEYWORDS, "other-expense");
    if (date && date > today) return null; // money can't be logged in the future
    return { kind, amount, category, description, date: date ?? today };
  }

  const todo = /^(todo|tugas|task|t)\s+(.+)$/i.exec(text);
  if (todo) {
    const { date, rest } = extractDate(todo[2], today);
    return rest ? { kind: "todo", title: rest, dueDate: date } : null;
  }

  const habit = /^(done|selesai|cek|check|✓|✔)\s*(.+)$/i.exec(text);
  if (habit) return { kind: "habit", query: habit[2].trim() };

  const sleep = /^(tidur|sleep)\s+(\d{1,2})[:.](\d{2})\s*(?:-|–|sampai|to|s\/d)?\s*(\d{1,2})[:.](\d{2})$/i.exec(text);
  if (sleep) {
    const [, , bh, bm, wh, wm] = sleep;
    if (+bh > 23 || +wh > 23 || +bm > 59 || +wm > 59) return null;
    const pad = (n: string) => n.padStart(2, "0");
    return { kind: "sleep", bedtime: `${pad(bh)}:${bm}`, wakeTime: `${pad(wh)}:${wm}` };
  }

  const wish = /^(wish|ingin|mau beli)\s+(\d[\d.,]*)\s*(rb|ribu|k|jt|juta)?(?=\s|$)\s*(.+)$/i.exec(text);
  if (wish) {
    const price = parseAmount(wish[2], wish[3]);
    const name = wish[4].trim();
    if (price === null || !name) return null;
    const category = guessCategory(name.toLowerCase().split(/\s+/), EXPENSE_KEYWORDS, "shopping");
    return { kind: "wish", price, name, category };
  }

  const priority = /^(prioritas|fokus|priority|focus)\s+(.+)$/i.exec(text);
  if (priority) return { kind: "priority", title: priority[2].trim() };

  const mood = /^mood\s+(\S+)\s*(.*)$/i.exec(text);
  if (mood) {
    const value = MOOD_WORDS[mood[1].toLowerCase()];
    return value ? { kind: "mood", mood: value, note: mood[2].trim() } : null;
  }

  return null;
}

/** Best habit match for a "done …" query: exact, then prefix, then substring (case-insensitive). */
export function matchHabit<T extends { name: string }>(habits: T[], query: string): T | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;
  const name = (h: T) => h.name.toLowerCase();
  return (
    habits.find((h) => name(h) === q) ??
    habits.find((h) => name(h).startsWith(q)) ??
    habits.find((h) => name(h).includes(q)) ??
    null
  );
}

/** Returns an error key when the edited command can't be saved, else null. */
export function validateQuickAdd(q: QuickAdd, today: string): string | null {
  const positive = (n: number) => Number.isFinite(n) && n > 0 && n <= 1_000_000_000_000;
  switch (q.kind) {
    case "expense":
    case "income":
      if (!positive(q.amount)) return "amount";
      if (!isDateKey(q.date) || q.date > today) return "date";
      return null;
    case "todo":
      if (!q.title.trim()) return "title";
      if (q.dueDate !== null && !isDateKey(q.dueDate)) return "date";
      return null;
    case "habit":
      return q.query.trim() ? null : "habit";
    case "sleep":
      return isLocalTime(q.bedtime) && isLocalTime(q.wakeTime) ? null : "time";
    case "mood":
      return null;
    case "wish":
      if (!q.name.trim()) return "title";
      return positive(q.price) ? null : "amount";
    case "priority":
      return q.title.trim() ? null : "title";
  }
}
