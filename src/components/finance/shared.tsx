"use client";

import { useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, FieldError as CommonFieldError, useDateFormat } from "@/components/common";
import { formatCurrency } from "@/lib/format";
import { shiftMonth, type MonthKey } from "@/lib/date";

export { ConfirmDialog, useDateFormat };

export function useMoney(currency: string | undefined) {
  const locale = useLocale();
  return useCallback(
    (amount: number) => formatCurrency(amount, currency ?? "IDR", locale),
    [currency, locale]
  );
}

/** Label for a category key; falls back to the raw value for legacy/custom categories. */
export function useCategoryLabel() {
  const t = useTranslations("Finance.categories");
  return useCallback((key: string) => (t.has(key) ? t(key) : key), [t]);
}

export function MonthSwitcher({ month, onChange }: { month: MonthKey; onChange: (m: MonthKey) => void }) {
  const t = useTranslations("Common");
  const formatDate = useDateFormat();

  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon-sm" onClick={() => onChange(shiftMonth(month, -1))} aria-label={t("prevMonth")}>
        <ChevronLeft />
      </Button>
      <span className="min-w-36 text-center text-sm font-medium tabular-nums">
        {formatDate(`${month}-01`, "MMMM yyyy")}
      </span>
      <Button variant="outline" size="icon-sm" onClick={() => onChange(shiftMonth(month, 1))} aria-label={t("nextMonth")}>
        <ChevronRight />
      </Button>
    </div>
  );
}

/** Field error text; `message` is a key under Finance.errors. */
export function FieldError({ message }: { message?: string }) {
  return <CommonFieldError message={message} ns="Finance.errors" />;
}
