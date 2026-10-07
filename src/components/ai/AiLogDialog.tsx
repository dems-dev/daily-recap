"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Pencil, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { useQuickAddActions } from "@/components/quick-add/use-quick-add-actions";
import { useInvalidate, useJson } from "@/hooks/use-json";
import { useMe } from "@/hooks/use-me";
import type { QuickAdd } from "@/lib/quick-add";
import type { HabitsResponse } from "@/components/habits/habit-types";
import { QuickAddEditor } from "./QuickAddEditor";

type ParseResult = {
  today: string;
  items: QuickAdd[];
  rejected: { kind: string; reason: string }[];
  notUnderstood: string[];
};

/**
 * Sends free text to /api/ai/parse, shows the proposed entries, and saves the ones
 * the user keeps checked. Nothing is saved without confirmation.
 */
export function AiLogDialog({
  text,
  onOpenChange,
  onSaved,
}: {
  /** The text to parse; the dialog is open while this is non-null. */
  text: string | null;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}) {
  const t = useTranslations("AiLog");
  const tc = useTranslations("Common");
  const invalidate = useInvalidate();
  const open = text !== null;
  const { data: me } = useMe(open);
  const { data: habits } = useJson<HabitsResponse>(open ? "/api/habits" : null);
  const { describe, execute } = useQuickAddActions({
    today: me?.today ?? null,
    habits: habits?.habits ?? [],
    currency: me?.currency,
  });

  const [result, setResult] = useState<{ text: string; data?: ParseResult; error?: string } | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  // Editable copy of the proposals; `editing` is the row whose form is open.
  const [items, setItems] = useState<QuickAdd[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (text === null) return;
    let cancelled = false;
    fetch("/api/ai/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.code === "rate_limited" ? t("rateLimited") : t("failed"));
        return json as ParseResult;
      })
      .then((data) => {
        if (cancelled) return;
        setResult({ text, data });
        setItems(data.items);
        setEditing(null);
        setSelected(new Set(data.items.map((_, i) => i)));
      })
      .catch((err: Error) => !cancelled && setResult({ text, error: err.message }));
    return () => {
      cancelled = true;
    };
  }, [text, t]);

  const current = result?.text === text ? result : null;

  const save = async () => {
    if (!current?.data) return;
    setSaving(true);
    let ok = 0;
    const failures: string[] = [];
    for (const [i, item] of items.entries()) {
      if (!selected.has(i)) continue;
      try {
        await execute(item);
        ok += 1;
      } catch (err) {
        failures.push(`${describe(item)} - ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    setSaving(false);
    invalidate();
    if (ok > 0) toast.add({ title: t("saved", { count: ok }), type: "success" });
    if (failures.length) toast.add({ title: t("someFailed", { count: failures.length }), description: failures.join("\n"), type: "error" });
    if (failures.length === 0) {
      onOpenChange(false);
      onSaved?.();
    }
  };

  const toggle = (i: number, on: boolean) =>
    setSelected((s) => {
      const next = new Set(s);
      if (on) next.add(i);
      else next.delete(i);
      return next;
    });

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4" aria-hidden /> {t("title")}
          </DialogTitle>
          <DialogDescription className="line-clamp-3">“{text}”</DialogDescription>
        </DialogHeader>

        {!current ? (
          <div className="space-y-2" aria-busy="true">
            <p className="text-sm text-muted-foreground">{t("reading")}</p>
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        ) : current.error ? (
          <p className="text-sm text-destructive" role="alert">
            {current.error}
          </p>
        ) : current.data && items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("nothingFound")}</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("review")}</p>
            <ul className="max-h-[50vh] space-y-1.5 overflow-y-auto">
              {items.map((item, i) =>
                editing === i ? (
                  <li key={i}>
                    <QuickAddEditor
                      item={item}
                      today={current.data!.today}
                      habits={habits?.habits ?? []}
                      onCancel={() => setEditing(null)}
                      onSave={(next) => {
                        setItems((list) => list.map((x, j) => (j === i ? next : x)));
                        toggle(i, true);
                        setEditing(null);
                      }}
                    />
                  </li>
                ) : (
                  <li key={i} className="flex items-start gap-1 rounded-lg border p-1 hover:bg-muted/40">
                    <label className="flex flex-1 cursor-pointer items-start gap-3 p-1.5 text-sm">
                      <Checkbox className="mt-0.5" checked={selected.has(i)} onCheckedChange={(c) => toggle(i, c === true)} />
                      <span className="flex-1">{describe(item)}</span>
                    </label>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setEditing(i)}
                      disabled={saving || editing !== null}
                      aria-label={t("editEntry")}
                    >
                      <Pencil />
                    </Button>
                  </li>
                )
              )}
            </ul>
          </div>
        )}

        {current?.data && (current.data.rejected.length > 0 || current.data.notUnderstood.length > 0) && (
          <div className="flex gap-2 rounded-lg bg-muted/50 p-2.5 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <div className="space-y-0.5">
              {current.data.rejected.length > 0 && <p>{t("rejected", { count: current.data.rejected.length })}</p>}
              {current.data.notUnderstood.map((s, i) => (
                <p key={i}>{t("notUnderstood", { text: s })}</p>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {tc("cancel")}
          </Button>
          <Button onClick={save} disabled={saving || !current?.data || selected.size === 0 || editing !== null}>
            {saving ? t("saving") : t("saveSelected", { count: selected.size })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
