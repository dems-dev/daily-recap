"use client";

import { useCallback, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { format } from "date-fns";
import { enUS, id as idLocale } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { dateKeyToLocalDate, type DateKey } from "@/lib/date";
import { Laugh, Smile, Meh, Frown, Annoyed, type LucideIcon } from "lucide-react";
import { type Mood } from "@/lib/journal";
import { cn } from "@/lib/utils";

export function useDateLocale() {
  return useLocale() === "id" ? idLocale : enUS;
}

export function useDateFormat() {
  const dateLocale = useDateLocale();
  return useCallback(
    (key: DateKey, pattern = "d MMM yyyy") => format(dateKeyToLocalDate(key), pattern, { locale: dateLocale }),
    [dateLocale]
  );
}

/** Field error text; `message` is a translation key (set in zod schemas), looked up in `ns` then Common.errors. */
export function FieldError({ message, ns }: { message?: string; ns?: string }) {
  const tNs = useTranslations(ns ?? "Common.errors");
  const tCommon = useTranslations("Common.errors");
  if (!message) return null;
  const text = tNs.has(message) ? tNs(message) : tCommon.has(message) ? tCommon(message) : message;
  return <p className="text-xs text-destructive">{text}</p>;
}

/** Toast for a failed request, with the server message as detail. */
export function useFailureToast() {
  const t = useTranslations("Common");
  return useCallback(
    (err: unknown) =>
      toast.add({ title: t("saveFailed"), description: err instanceof Error ? err.message : String(err), type: "error" }),
    [t]
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void>;
}) {
  const t = useTranslations("Common");
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
            {confirmLabel ?? t("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-gradient">{title}</h1>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

const MOOD_CONFIG: Record<Mood, { icon: LucideIcon; color: string; score: number }> = {
  great: { icon: Laugh, color: "text-emerald-500", score: 5 },
  good: { icon: Smile, color: "text-green-500", score: 4 },
  okay: { icon: Meh, color: "text-yellow-500", score: 3 },
  bad: { icon: Frown, color: "text-orange-500", score: 2 },
  terrible: { icon: Annoyed, color: "text-red-500", score: 1 },
};

export function MoodIcon({ mood, score, className }: { mood?: Mood; score?: number; className?: string }) {
  let config = MOOD_CONFIG.okay;

  if (mood && MOOD_CONFIG[mood]) {
    config = MOOD_CONFIG[mood];
  } else if (score !== undefined) {
    const rounded = Math.max(1, Math.min(5, Math.round(score)));
    const matchedMood = (Object.keys(MOOD_CONFIG) as Mood[]).find(
      (key) => MOOD_CONFIG[key].score === rounded
    );
    if (matchedMood) config = MOOD_CONFIG[matchedMood];
  }

  const Icon = config.icon;

  return (
    <Icon className={cn(config.color, "inline-block shrink-0 h-5 w-5", className)} aria-hidden="true" />
  );
}
