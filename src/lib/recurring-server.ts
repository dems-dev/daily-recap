import prisma from "@/lib/prisma";
import { dateKeyToDate, dateToKey, type DateKey } from "@/lib/date";
import { dueOccurrences, type Frequency } from "@/lib/recurring";

/**
 * Creates the Finance rows of every recurring rule that came due up to `today`.
 * Called lazily whenever finance data is read, so no scheduler is needed.
 * Each rule is claimed by moving `nextDate` forward only if it still has the
 * value we read - two concurrent requests can't both generate the same rows.
 */
export async function materializeRecurring(userId: string, today: DateKey) {
  const due = await prisma.recurringTransaction.findMany({
    where: { userId, isActive: true, nextDate: { lte: dateKeyToDate(today) } },
  });

  let created = 0;
  for (const rule of due) {
    const { dates, nextDate } = dueOccurrences(
      dateToKey(rule.anchorDate),
      dateToKey(rule.nextDate),
      rule.frequency as Frequency,
      today
    );
    if (dates.length === 0) continue;

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.recurringTransaction.updateMany({
        where: { id: rule.id, nextDate: rule.nextDate },
        data: { nextDate: dateKeyToDate(nextDate) },
      });
      if (claimed.count === 0) return; // another request got here first

      await tx.finance.createMany({
        data: dates.map((date) => ({
          userId,
          type: rule.type,
          amount: rule.amount,
          category: rule.category,
          description: rule.description,
          date: dateKeyToDate(date),
          isRecurring: true,
          recurringType: rule.frequency,
          recurringId: rule.id,
        })),
      });
      created += dates.length;
    });
  }
  return created;
}
