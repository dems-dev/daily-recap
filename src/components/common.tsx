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
import { type Mood } from "@/lib/journal";
import { MoodFace } from "@/components/ui/mood-face";

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

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-gradient">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/** Custom mood emoticon. Kept as `MoodIcon` for existing call sites. */
export function MoodIcon({
  mood,
  score,
  size = 20,
  className,
}: {
  mood?: Mood;
  score?: number;
  size?: number;
  className?: string;
}) {
  return <MoodFace mood={mood} score={score} size={size} className={className} />;
}
