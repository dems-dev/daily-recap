"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, GraduationCap, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFailureToast } from "@/components/common";
import { sendJson, useInvalidate } from "@/hooks/use-json";
import { useMe } from "@/hooks/use-me";

type CoachResult = {
  weekStart: string;
  nextWeekDate: string;
  review: string;
  wins: string[];
  suggestions: { title: string; reason: string }[];
};

/** AI weekly review with one-click "make it next week's priority". Shown only when AI is on. */
export function WeeklyCoach({ date }: { date: string }) {
  const t = useTranslations("Coach");
  const { data: me } = useMe();
  const invalidate = useInvalidate();
  const onFail = useFailureToast();
  const [state, setState] = useState<{ date: string; result?: CoachResult; error?: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState<Set<string>>(new Set());

  if (!me?.aiEnabled) return null;
  const current = state?.date === date ? state : null;

  const run = async () => {
    setLoading(true);
    try {
      const result = (await sendJson("/api/ai/coach", "POST", { date })) as CoachResult;
      setState({ date, result });
      setAdded(new Set());
    } catch {
      setState({ date, error: true });
    } finally {
      setLoading(false);
    }
  };

  const addPriority = async (title: string) => {
    if (!current?.result) return;
    try {
      await sendJson("/api/plans", "POST", { date: current.result.nextWeekDate, title });
      setAdded((s) => new Set(s).add(title));
      invalidate();
    } catch (err) {
      onFail(err);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="size-4" aria-hidden /> {t("title")}
        </CardTitle>
        <Button size="sm" variant="outline" onClick={run} disabled={loading}>
          {loading ? t("thinking") : current?.result ? t("again") : t("start")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {loading && !current?.result ? (
          <div className="space-y-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-20" />
          </div>
        ) : current?.error ? (
          <p className="text-destructive" role="alert">
            {t("failed")}
          </p>
        ) : current?.result ? (
          <>
            <p className="leading-relaxed">{current.result.review}</p>
            {current.result.wins.length > 0 && (
              <div className="space-y-1">
                <p className="font-medium">{t("wins")}</p>
                <ul className="space-y-1">
                  {current.result.wins.map((w, i) => (
                    <li key={i} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-viz-good" aria-hidden />
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="space-y-2">
              <p className="font-medium">{t("suggestions")}</p>
              <ul className="space-y-2">
                {current.result.suggestions.map((s) => (
                  <li key={s.title} className="flex items-start gap-3 rounded-lg border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{s.title}</p>
                      <p className="text-xs text-muted-foreground">{s.reason}</p>
                    </div>
                    <Button
                      size="sm"
                      variant={added.has(s.title) ? "ghost" : "secondary"}
                      className="shrink-0 gap-1"
                      disabled={added.has(s.title)}
                      onClick={() => addPriority(s.title)}
                    >
                      {added.has(s.title) ? <Check /> : <Plus />}
                      {added.has(s.title) ? t("added") : t("addToNextWeek")}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">{t("intro")}</p>
        )}
        <p className="text-xs text-muted-foreground">{t("privacy")}</p>
      </CardContent>
    </Card>
  );
}
