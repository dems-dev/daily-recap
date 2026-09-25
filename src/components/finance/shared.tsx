"use client";

import { useCallback, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { format } from "date-fns";
import { enUS, id as idLocale } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";
import { dateKeyToLocalDate, shiftMonth, type DateKey, type MonthKey } from "@/lib/date";

export function useMoney(currency: string | undefined) {
  const locale = useLocale();
  return useCallback(
    (amount: number) => formatCurrency(amount, currency ?? "IDR", locale),
    [currency, locale]
  );
}

export function useDateFormat() {
  const locale = useLocale();
  const dateLocale = locale === "id" ? idLocale : enUS;
  return useCallback(
    (key: DateKey, pattern = "d MMM yyyy") => format(dateKeyToLocalDate(key), pattern, { locale: dateLocale }),
    [dateLocale]
  );
}

/** Label for a category key; falls back to the raw value for legacy/custom categories. */
export function useCategoryLabel() {
  const t = useTranslations("Finance.categories");
  return useCallback((key: string) => (t.has(key) ? t(key) : key), [t]);
}

export function MonthSwitcher({ month, onChange }: { month: MonthKey; onChange: (m: MonthKey) => void }) {
  const t = useTranslations("Finance");
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

/** Field error text; `message` is a key under Finance.errors (set in the zod schemas). */
export function FieldError({ message }: { message?: string }) {
  const t = useTranslations("Finance.errors");
  if (!message) return null;
  return <p className="text-xs text-destructive">{t.has(message) ? t(message) : message}</p>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  onConfirm: () => Promise<void>;
}) {
  const t = useTranslations("Finance");
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                onOpenChange(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
