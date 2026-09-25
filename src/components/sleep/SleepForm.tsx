"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Moon, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { useFailureToast } from "@/components/common";
import { sendJson, useInvalidate } from "@/hooks/use-json";
import { formatDuration, isLocalTime } from "@/lib/sleep";
import { cn } from "@/lib/utils";

export type SleepLogDTO = {
  date: string;
  bedtime: string;
  wakeTime: string;
  duration: number;
  quality: number;
  notes: string | null;
};

const minutesOf = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** Duration the server will compute for these clock times (bedtime after wake time = evening before). */
export function previewDuration(bedtime: string, wakeTime: string) {
  if (!isLocalTime(bedtime) || !isLocalTime(wakeTime)) return null;
  const diff = minutesOf(wakeTime) - minutesOf(bedtime);
  return diff > 0 ? diff : diff + 24 * 60;
}

export function QualityPicker({ value, onChange }: { value: number; onChange: (q: number) => void }) {
  const t = useTranslations("Sleep");
  return (
    <div className="flex gap-1" role="radiogroup" aria-label={t("quality")}>
      {[1, 2, 3, 4, 5].map((q) => (
        <button
          key={q}
          type="button"
          role="radio"
          aria-checked={value === q}
          aria-label={t(`qualityLevels.${q}`)}
          title={t(`qualityLevels.${q}`)}
          onClick={() => onChange(q)}
          className="rounded-md p-1 hover:bg-muted"
        >
          <Star className={cn("size-5", q <= value ? "fill-current text-foreground" : "text-muted-foreground")} />
        </button>
      ))}
    </div>
  );
}

/** Log the night that ended on the morning of `date`. Remount with a `key` to load another night. */
export function SleepForm({ date, existing, compact = false }: { date: string; existing?: SleepLogDTO | null; compact?: boolean }) {
  const t = useTranslations("Sleep");
  const tc = useTranslations("Common");
  const locale = useLocale();
  const invalidate = useInvalidate();
  const onFail = useFailureToast();
  const [bedtime, setBedtime] = useState(existing?.bedtime ?? "23:00");
  const [wakeTime, setWakeTime] = useState(existing?.wakeTime ?? "06:30");
  const [quality, setQuality] = useState(existing?.quality ?? 3);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const duration = previewDuration(bedtime, wakeTime);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (duration === null || duration < 30 || duration > 16 * 60) {
      setError(t("errors.implausibleDuration"));
      return;
    }
    setSaving(true);
    try {
      await sendJson(`/api/sleep/${date}`, "PUT", { bedtime, wakeTime, quality, notes: notes || null });
      toast.add({ title: t("saved", { duration: formatDuration(duration, locale) }), type: "success" });
      invalidate();
    } catch (err) {
      onFail(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor={`bed-${date}`}>{t("bedtime")}</Label>
          <Input id={`bed-${date}`} type="time" required value={bedtime} onChange={(e) => setBedtime(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`wake-${date}`}>{t("wakeTime")}</Label>
          <Input id={`wake-${date}`} type="time" required value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} />
        </div>
      </div>
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums">
        <Moon className="size-4" aria-hidden />
        {duration !== null ? t("durationPreview", { duration: formatDuration(duration, locale) }) : "—"}
      </p>
      <div className="space-y-2">
        <p className="text-sm font-medium">{t("quality")}</p>
        <QualityPicker value={quality} onChange={setQuality} />
      </div>
      {!compact && (
        <div className="space-y-2">
          <Label htmlFor={`notes-${date}`}>{t("notes")}</Label>
          <Input id={`notes-${date}`} value={notes} maxLength={500} placeholder={t("notesPlaceholder")} onChange={(e) => setNotes(e.target.value)} />
        </div>
      )}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {tc("save")}
        </Button>
      </div>
    </form>
  );
}
