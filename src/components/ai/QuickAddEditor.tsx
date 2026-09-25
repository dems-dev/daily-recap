"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCategoryLabel } from "@/components/finance/shared";
import { MoodPicker } from "@/components/journal/JournalEditor";
import { categoriesFor, EXPENSE_CATEGORIES } from "@/lib/finance";
import { validateQuickAdd, type QuickAdd } from "@/lib/quick-add";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      {children}
    </div>
  );
}

/** Inline form to correct one proposed entry before it's saved. */
export function QuickAddEditor({
  item,
  today,
  habits,
  onSave,
  onCancel,
}: {
  item: QuickAdd;
  today: string;
  habits: { name: string }[];
  onSave: (item: QuickAdd) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("AiLog.edit");
  const tf = useTranslations("Finance");
  const tc = useTranslations("Common");
  const categoryLabel = useCategoryLabel();
  const [draft, setDraft] = useState<QuickAdd>(item);
  const [error, setError] = useState<string | null>(null);
  const id = (name: string) => `qa-edit-${name}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- each branch below only sets fields of its own kind
  const set = (patch: Record<string, any>) => setDraft((d) => ({ ...d, ...patch }) as QuickAdd);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validateQuickAdd(draft, today);
    if (problem) {
      setError(t(`errors.${problem}`));
      return;
    }
    onSave(draft);
  };

  const categorySelect = (kind: "income" | "expense", value: string) => (
    <select id={id("category")} className={selectClass} value={value} onChange={(e) => set({ category: e.target.value })}>
      {categoriesFor(kind).map((c) => (
        <option key={c} value={c}>
          {categoryLabel(c)}
        </option>
      ))}
    </select>
  );

  return (
    <form onSubmit={save} className="space-y-3 rounded-lg border bg-muted/30 p-3" noValidate>
      {(draft.kind === "expense" || draft.kind === "income") && (
        <>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-label={tf("type")}>
            {(["expense", "income"] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                role="radio"
                aria-checked={draft.kind === kind}
                onClick={() =>
                  draft.kind !== kind &&
                  set({ kind, category: kind === "income" ? "other-income" : "other-expense" })
                }
                className={
                  draft.kind === kind
                    ? "rounded-md bg-background px-2 py-1 text-xs font-medium shadow-sm"
                    : "rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                }
              >
                {tf(kind)}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field id={id("amount")} label={tf("amount")}>
              <Input
                id={id("amount")}
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={Number.isFinite(draft.amount) ? draft.amount : ""}
                onChange={(e) => set({ amount: e.target.valueAsNumber })}
              />
            </Field>
            <Field id={id("date")} label={tf("date")}>
              <Input id={id("date")} type="date" max={today} value={draft.date} onChange={(e) => set({ date: e.target.value })} />
            </Field>
          </div>
          <Field id={id("category")} label={tf("category")}>
            {categorySelect(draft.kind, draft.category)}
          </Field>
          <Field id={id("description")} label={tf("description")}>
            <Input id={id("description")} maxLength={200} value={draft.description} onChange={(e) => set({ description: e.target.value })} />
          </Field>
        </>
      )}

      {draft.kind === "todo" && (
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Field id={id("title")} label={t("title")}>
            <Input id={id("title")} maxLength={200} value={draft.title} onChange={(e) => set({ title: e.target.value })} />
          </Field>
          <Field id={id("due")} label={t("dueDate")}>
            <Input id={id("due")} type="date" value={draft.dueDate ?? ""} onChange={(e) => set({ dueDate: e.target.value || null })} />
          </Field>
        </div>
      )}

      {draft.kind === "habit" && (
        <Field id={id("habit")} label={t("habit")}>
          <select id={id("habit")} className={selectClass} value={draft.query} onChange={(e) => set({ query: e.target.value })}>
            {!habits.some((h) => h.name === draft.query) && <option value={draft.query}>{draft.query}</option>}
            {habits.map((h) => (
              <option key={h.name} value={h.name}>
                {h.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      {draft.kind === "sleep" && (
        <div className="grid grid-cols-2 gap-2">
          <Field id={id("bed")} label={t("bedtime")}>
            <Input id={id("bed")} type="time" value={draft.bedtime} onChange={(e) => set({ bedtime: e.target.value })} />
          </Field>
          <Field id={id("wake")} label={t("wakeTime")}>
            <Input id={id("wake")} type="time" value={draft.wakeTime} onChange={(e) => set({ wakeTime: e.target.value })} />
          </Field>
        </div>
      )}

      {draft.kind === "mood" && (
        <>
          <MoodPicker value={draft.mood} onChange={(mood) => set({ mood })} />
          <Field id={id("note")} label={t("note")}>
            <Input id={id("note")} maxLength={2000} value={draft.note} onChange={(e) => set({ note: e.target.value })} />
          </Field>
        </>
      )}

      {draft.kind === "wish" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field id={id("name")} label={t("item")}>
              <Input id={id("name")} maxLength={120} value={draft.name} onChange={(e) => set({ name: e.target.value })} />
            </Field>
            <Field id={id("price")} label={t("price")}>
              <Input
                id={id("price")}
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={Number.isFinite(draft.price) ? draft.price : ""}
                onChange={(e) => set({ price: e.target.valueAsNumber })}
              />
            </Field>
          </div>
          <Field id={id("category")} label={tf("category")}>
            <select id={id("category")} className={selectClass} value={draft.category} onChange={(e) => set({ category: e.target.value })}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
                </option>
              ))}
            </select>
          </Field>
        </>
      )}

      {draft.kind === "priority" && (
        <Field id={id("title")} label={t("title")}>
          <Input id={id("title")} maxLength={120} value={draft.title} onChange={(e) => set({ title: e.target.value })} />
        </Field>
      )}

      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          {tc("cancel")}
        </Button>
        <Button type="submit" size="sm">
          {t("apply")}
        </Button>
      </div>
    </form>
  );
}
