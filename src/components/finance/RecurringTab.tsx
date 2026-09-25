"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Pause, Pencil, Play, Repeat, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { categoriesFor } from "@/lib/finance";
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
  const [editing, setEditing] = useState<Rule | null>(null);

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
                  <Button variant="ghost" size="icon-sm" onClick={() => setEditing(rule)} aria-label={tc("edit")}>
                    <Pencil />
                  </Button>
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

      <RecurringEditDialog rule={editing} onOpenChange={(open) => !open && setEditing(null)} />
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

function RecurringEditDialog({ rule, onOpenChange }: { rule: Rule | null; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("Finance");
  const tc = useTranslations("Common");
  const categoryLabel = useCategoryLabel();
  const invalidate = useInvalidate();
  const onFail = useFailureToast();
  const [form, setForm] = useState({ amount: "", category: "", description: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!rule) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load the rule into the form each time it opens
    setForm({ amount: String(rule.amount), category: rule.category, description: rule.description ?? "" });
    setError(null);
  }, [rule]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rule) return;
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError(t("errors.positive"));
      return;
    }
    setSaving(true);
    try {
      await sendJson(`/api/finance/recurring/${rule.id}`, "PATCH", {
        amount,
        category: form.category,
        description: form.description,
      });
      toast.add({ title: tc("saved"), type: "success" });
      onOpenChange(false);
      invalidate();
    } catch (err) {
      onFail(err);
    } finally {
      setSaving(false);
    }
  };

  const selectClass =
    "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

  return (
    <Dialog open={!!rule} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("editRecurring")}</DialogTitle>
          <DialogDescription>{t("editRecurringHint")}</DialogDescription>
        </DialogHeader>
        {rule && (
          <form id="recurring-edit" onSubmit={save} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="rec-amount">{t("amount")}</Label>
                <Input
                  id="rec-amount"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rec-category">{t("category")}</Label>
                <select
                  id="rec-category"
                  className={selectClass}
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {categoriesFor(rule.type).map((c) => (
                    <option key={c} value={c}>
                      {categoryLabel(c)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rec-description">{t("description")}</Label>
              <Input
                id="rec-description"
                maxLength={200}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            {error && (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            )}
          </form>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {tc("cancel")}
          </Button>
          <Button type="submit" form="recurring-edit" disabled={saving}>
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
