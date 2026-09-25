"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Pause, Play, Repeat, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { useFailureToast } from "@/components/common";
import { sendJson, useInvalidate, useJson } from "@/hooks/use-json";
import { cn } from "@/lib/utils";
import { ConfirmDialog, useCategoryLabel, useDateFormat, useMoney } from "./shared";

type Rule = {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string | null;
  frequency: "weekly" | "monthly" | "yearly";
  anchorDate: string;
  nextDate: string;
  isActive: boolean;
  generated: number;
};

export function RecurringTab({ onAdd }: { onAdd: () => void }) {
  const t = useTranslations("Finance");
  const tc = useTranslations("Common");
  const categoryLabel = useCategoryLabel();
  const formatDate = useDateFormat();
  const invalidate = useInvalidate();
  const onFail = useFailureToast();
  const { data } = useJson<{ today: string; currency: string; rules: Rule[] }>("/api/finance/recurring");
  const money = useMoney(data?.currency);
  const [deleting, setDeleting] = useState<Rule | null>(null);

  const setActive = async (rule: Rule, isActive: boolean) => {
    try {
      await sendJson(`/api/finance/recurring/${rule.id}`, "PATCH", { isActive });
      toast.add({ title: isActive ? t("recurringResumed") : t("recurringPaused"), type: "success" });
      invalidate();
    } catch (err) {
      onFail(err);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle>{t("recurringTitle")}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{t("recurringDescription")}</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={onAdd}>
          <Repeat /> {t("addRecurring")}
        </Button>
      </CardHeader>
      <CardContent>
        {!data ? (
          <Skeleton className="h-24" />
        ) : data.rules.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("noRecurring")}</p>
        ) : (
          <ul className="divide-y">
            {data.rules.map((rule) => (
              <li key={rule.id} className={cn("flex flex-wrap items-center gap-3 py-3", !rule.isActive && "opacity-60")}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{rule.description || categoryLabel(rule.category)}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(`frequency.${rule.frequency}`)} · {categoryLabel(rule.category)} ·{" "}
                    {rule.isActive ? t("nextOn", { date: formatDate(rule.nextDate) }) : t("paused")} ·{" "}
                    {t("generatedCount", { count: rule.generated })}
                  </p>
                </div>
                <span className={cn("text-sm font-medium tabular-nums", rule.type === "income" && "text-green-700 dark:text-green-400")}>
                  {rule.type === "income" ? "+" : "−"}
                  {money(rule.amount)}
                </span>
                <div className="flex">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setActive(rule, !rule.isActive)}
                    aria-label={rule.isActive ? t("pause") : t("resume")}
                  >
                    {rule.isActive ? <Pause /> : <Play />}
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(rule)} aria-label={tc("delete")}>
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteRecurringTitle")}
        description={t("deleteRecurringDescription")}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await sendJson(`/api/finance/recurring/${deleting.id}`, "DELETE");
            toast.add({ title: tc("deleted"), type: "success" });
            invalidate();
          } catch (err) {
            onFail(err);
          }
        }}
      />
    </Card>
  );
}
