"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMe } from "@/hooks/use-me";
import { sendJson } from "@/hooks/use-json";

/** "Summarize with AI" — only shown when the server has the AI Gateway configured. */
export function AiSummary({ period, date }: { period: "day" | "week" | "month"; date: string }) {
  const t = useTranslations("Recap.ai");
  const { data: me } = useMe();
  const [state, setState] = useState<{ key: string; text?: string; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const key = `${period}|${date}`;

  if (!me?.aiEnabled) return null;

  const current = state?.key === key ? state : null;

  const run = async () => {
    setLoading(true);
    try {
      const res = (await sendJson("/api/recap/ai", "POST", { period, date })) as { summary: string };
      setState({ key, text: res.summary });
    } catch (err) {
      setState({ key, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4" aria-hidden /> {t("title")}
        </CardTitle>
        <Button size="sm" variant="outline" onClick={run} disabled={loading}>
          {loading ? t("loading") : current?.text ? t("regenerate") : t("generate")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {current?.text ? (
          <p className="whitespace-pre-line text-sm leading-relaxed">{current.text}</p>
        ) : current?.error ? (
          <p className="text-sm text-destructive" role="alert">
            {t("failed")}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{t("intro")}</p>
        )}
        <p className="text-xs text-muted-foreground">{t("privacy")}</p>
      </CardContent>
    </Card>
  );
}
