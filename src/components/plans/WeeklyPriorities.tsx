"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Target, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateFormat, useFailureToast } from "@/components/common";
import { sendJson, useInvalidate, useJson } from "@/hooks/use-json";
import { MAX_PRIORITIES, RECOMMENDED_PRIORITIES } from "@/lib/plans";
import { cn } from "@/lib/utils";

type PlanResponse = {
  today: string;
  weekStart: string;
  weekEnd: string;
  isCurrentWeek: boolean;
  nextWeekDate: string;
  priorities: { id: string; title: string; isDone: boolean }[];
};

/** Priorities of the week containing `date` (defaults to this week). */
export function WeeklyPriorities({ date, title, emptyHint }: { date?: string; title?: string; emptyHint?: string }) {
  const t = useTranslations("Plans");
  const formatDate = useDateFormat();
  const invalidate = useInvalidate();
  const onFail = useFailureToast();
  const { data } = useJson<PlanResponse>(`/api/plans${date ? `?date=${date}` : ""}`);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !data) return;
    setBusy(true);
    try {
      await sendJson("/api/plans", "POST", { date: data.weekStart, title: text });
      setDraft("");
      invalidate();
    } catch (err) {
      onFail(err);
    } finally {
      setBusy(false);
    }
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    try {
      await sendJson(`/api/plans/${id}`, "PATCH", body);
      invalidate();
    } catch (err) {
      onFail(err);
    }
  };

  const remove = async (id: string) => {
    try {
      await sendJson(`/api/plans/${id}`, "DELETE");
      invalidate();
    } catch (err) {
      onFail(err);
    }
  };

  const done = data?.priorities.filter((p) => p.isDone).length ?? 0;
  const total = data?.priorities.length ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="size-4" aria-hidden /> {title ?? t("thisWeek")}
        </CardTitle>
        {data && (
          <p className="text-sm text-muted-foreground tabular-nums">
            {formatDate(data.weekStart, "d MMM")} – {formatDate(data.weekEnd, "d MMM")}
            {total > 0 && ` · ${t("progress", { done, total })}`}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {!data ? (
          <Skeleton className="h-20" />
        ) : (
          <>
            {total === 0 && <p className="text-sm text-muted-foreground">{emptyHint ?? t("empty", { n: RECOMMENDED_PRIORITIES })}</p>}
            <ul className="space-y-1">
              {data.priorities.map((p, i) => (
                <li key={p.id} className="group flex items-center gap-3 rounded-lg px-1 py-1.5">
                  <Checkbox
                    checked={p.isDone}
                    onCheckedChange={(checked) => patch(p.id, { isDone: checked === true })}
                    aria-label={t(p.isDone ? "markOpen" : "markDone", { title: p.title })}
                  />
                  <span className="w-4 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                  <span className={cn("flex-1 text-sm", p.isDone && "text-muted-foreground line-through")}>{p.title}</span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                    onClick={() => remove(p.id)}
                    aria-label={t("remove", { title: p.title })}
                  >
                    <X />
                  </Button>
                </li>
              ))}
            </ul>
            {total < MAX_PRIORITIES && (
              <form onSubmit={add} className="flex gap-2">
                <Input
                  value={draft}
                  maxLength={120}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={total < RECOMMENDED_PRIORITIES ? t("placeholder") : t("placeholderExtra")}
                  aria-label={t("placeholder")}
                />
                <Button type="submit" variant="secondary" disabled={busy || !draft.trim()}>
                  {t("add")}
                </Button>
              </form>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
