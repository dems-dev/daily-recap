"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useQuickAdd } from "@/components/quick-add/QuickAddProvider";
import { useMe } from "@/hooks/use-me";

/** "Tell me about your day" — free text that AI turns into entries for review. Only for today. */
export function TellYourDay() {
  const t = useTranslations("AiLog");
  const { data: me } = useMe();
  const { openAiLog } = useQuickAdd();
  const [text, setText] = useState("");

  if (!me?.aiEnabled) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4" aria-hidden /> {t("tellTitle")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t("tellHint")}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          rows={3}
          value={text}
          maxLength={2000}
          placeholder={t("tellPlaceholder")}
          aria-label={t("tellTitle")}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{t("privacy")}</p>
          <Button
            className="shrink-0 gap-1.5"
            disabled={text.trim().length < 3}
            onClick={() => {
              openAiLog(text.trim());
              setText("");
            }}
          >
            <Sparkles /> {t("process")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
