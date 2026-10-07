"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ExternalLink, Hourglass, Pencil, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { useFailureToast } from "@/components/common";
import { sendJson, useInvalidate, useJson } from "@/hooks/use-json";
import { EXPENSE_CATEGORIES } from "@/lib/finance";
import { DEFAULT_WAIT_DAYS, wishlistSchema, type WishlistInput } from "@/lib/wishlist";
import { cn } from "@/lib/utils";
import { ConfirmDialog, FieldError, useCategoryLabel, useDateFormat, useMoney } from "./shared";

type Item = {
  id: string;
  name: string;
  price: number;
  category: string;
  url: string | null;
  note: string | null;
  addedOn: string;
  waitUntil: string;
  daysLeft: number;
  status: "waiting" | "bought" | "skipped";
  decidedOn: string | null;
};
type WishlistResponse = {
  today: string;
  currency: string;
  waiting: Item[];
  decided: Item[];
  stats: { waitingTotal: number; savedTotal: number; skippedCount: number; boughtCount: number };
};

const WAIT_OPTIONS = [3, 7, 14, 30];

export function WishlistTab() {
  const t = useTranslations("Wishlist");
  const tc = useTranslations("Common");
  const categoryLabel = useCategoryLabel();
  const formatDate = useDateFormat();
  const invalidate = useInvalidate();
  const onFail = useFailureToast();
  const { data } = useJson<WishlistResponse>("/api/wishlist");
  const money = useMoney(data?.currency);
  const [dialog, setDialog] = useState<{ item: Item | null } | null>(null);
  const [earlyBuy, setEarlyBuy] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState<Item | null>(null);

  const decide = async (item: Item, decision: "bought" | "skipped") => {
    try {
      await sendJson(`/api/wishlist/${item.id}`, "POST", { decision });
      toast.add({
        title: decision === "bought" ? t("boughtToast", { amount: money(item.price) }) : t("skippedToast", { amount: money(item.price) }),
        type: "success",
      });
      invalidate();
    } catch (err) {
      onFail(err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">{t("saved")}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{data ? money(data.stats.savedTotal) : "-"}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{data && t("skippedCount", { count: data.stats.skippedCount })}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">{t("waitingTotal")}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{data ? money(data.stats.waitingTotal) : "-"}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{data && t("waitingCount", { count: data.waiting.length })}</p>
        </div>
        <div className="flex items-center rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">{t("explainer")}</div>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Hourglass className="size-4" aria-hidden /> {t("waitingTitle")}
          </CardTitle>
          <Button size="sm" className="gap-1.5" onClick={() => setDialog({ item: null })}>
            <Plus /> {t("add")}
          </Button>
        </CardHeader>
        <CardContent>
          {!data ? (
            <Skeleton className="h-24" />
          ) : data.waiting.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <ul className="divide-y">
              {data.waiting.map((item) => {
                const totalWait = Math.max(1, Math.round((Date.parse(item.waitUntil) - Date.parse(item.addedOn)) / 86_400_000));
                const progress = 1 - item.daysLeft / totalWait;
                const ready = item.daysLeft === 0;
                return (
                  <li key={item.id} className="space-y-2 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                          {item.name}
                          {item.url && (
                            <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={t("openLink")} className="text-muted-foreground hover:text-foreground">
                              <ExternalLink className="size-3.5" />
                            </a>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {categoryLabel(item.category)} · {ready ? t("readyToDecide") : t("daysLeft", { count: item.daysLeft, date: formatDate(item.waitUntil, "d MMM") })}
                        </p>
                      </div>
                      <span className="text-sm font-medium tabular-nums">{money(item.price)}</span>
                      <div className="flex gap-1">
                        <Button size="icon-sm" variant="ghost" onClick={() => setDialog({ item })} aria-label={t("edit", { name: item.name })}>
                          <Pencil />
                        </Button>
                        <Button size="sm" variant={ready ? "default" : "outline"} className="gap-1" onClick={() => (ready ? decide(item, "bought") : setEarlyBuy(item))}>
                          <ShoppingBag /> {t("buy")}
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => decide(item, "skipped")}>
                          <X /> {t("skip")}
                        </Button>
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={totalWait} aria-valuenow={totalWait - item.daysLeft} aria-label={t("waitProgress", { name: item.name })}>
                      <div className={cn("h-full rounded-full", ready ? "bg-viz-good" : "bg-viz-1")} style={{ width: `${Math.min(1, Math.max(0.03, progress)) * 100}%` }} />
                    </div>
                    {item.note && <p className="text-xs text-muted-foreground">“{item.note}”</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {data && data.decided.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("history")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {data.decided.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-2 text-sm">
                  {item.status === "bought" ? (
                    <ShoppingBag className="size-4 text-muted-foreground" aria-hidden />
                  ) : (
                    <Check className="size-4 text-viz-good" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1 truncate">
                    {item.name}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {item.status === "bought" ? t("boughtOn", { date: formatDate(item.decidedOn!, "d MMM") }) : t("skippedOn", { date: formatDate(item.decidedOn!, "d MMM") })}
                    </span>
                  </span>
                  <span className={cn("tabular-nums", item.status === "skipped" && "text-muted-foreground line-through")}>{money(item.price)}</span>
                  <Button variant="ghost" size="icon-xs" onClick={() => setDeleting(item)} aria-label={tc("delete")}>
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <WishlistDialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)} item={dialog?.item ?? null} />
      <ConfirmDialog
        open={!!earlyBuy}
        onOpenChange={(open) => !open && setEarlyBuy(null)}
        title={t("earlyTitle")}
        description={earlyBuy ? t("earlyDescription", { count: earlyBuy.daysLeft, name: earlyBuy.name }) : undefined}
        confirmLabel={t("buyAnyway")}
        onConfirm={async () => {
          if (earlyBuy) await decide(earlyBuy, "bought");
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteTitle")}
        description={t("deleteDescription")}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await sendJson(`/api/wishlist/${deleting.id}`, "DELETE");
            invalidate();
          } catch (err) {
            onFail(err);
          }
        }}
      />
    </div>
  );
}

function WishlistDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit this waiting item; null to add a new one. */
  item: Item | null;
}) {
  const t = useTranslations("Wishlist");
  const tc = useTranslations("Common");
  const tf = useTranslations("Finance");
  const categoryLabel = useCategoryLabel();
  const invalidate = useInvalidate();
  const onFail = useFailureToast();
  const { register, control, handleSubmit, reset, formState } = useForm<WishlistInput>({
    resolver: zodResolver(wishlistSchema),
  });

  useEffect(() => {
    if (!open) return;
    reset(
      item
        ? {
            name: item.name,
            price: item.price,
            category: item.category as WishlistInput["category"],
            url: item.url ?? "",
            note: item.note ?? "",
            waitDays: DEFAULT_WAIT_DAYS,
          }
        : { name: "", category: "shopping", url: "", note: "", waitDays: DEFAULT_WAIT_DAYS }
    );
  }, [open, item, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (item) {
        const { waitDays: _wait, ...rest } = values;
        void _wait; // the waiting period isn't changed by an edit
        await sendJson(`/api/wishlist/${item.id}`, "PATCH", rest);
        toast.add({ title: tc("saved"), type: "success" });
      } else {
        await sendJson("/api/wishlist", "POST", values);
        toast.add({ title: t("addedToast", { days: values.waitDays ?? DEFAULT_WAIT_DAYS }), type: "success" });
      }
      onOpenChange(false);
      invalidate();
    } catch (err) {
      onFail(err);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? t("editTitle") : t("add")}</DialogTitle>
        </DialogHeader>
        <form id="wishlist-form" onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="wl-name">{t("name")}</Label>
            <Input id="wl-name" autoFocus placeholder={t("namePlaceholder")} aria-invalid={!!formState.errors.name} {...register("name")} />
            <FieldError message={formState.errors.name?.message} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="wl-price">{t("price")}</Label>
              <Input id="wl-price" type="number" inputMode="decimal" min={0} step="any" aria-invalid={!!formState.errors.price} {...register("price", { valueAsNumber: true })} />
              <FieldError message={formState.errors.price?.message} />
            </div>
            <div className="space-y-2">
              <Label>{tf("category")}</Label>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value ?? null} onValueChange={(v) => field.onChange(v)} items={Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c, categoryLabel(c)]))}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {categoryLabel(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          {!item && (
          <div className="space-y-2">
            <Label>{t("waitDays")}</Label>
            <Controller
              control={control}
              name="waitDays"
              render={({ field }) => (
                <div className="flex gap-1.5" role="radiogroup" aria-label={t("waitDays")}>
                  {WAIT_OPTIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      role="radio"
                      aria-checked={field.value === d}
                      onClick={() => field.onChange(d)}
                      className={cn("rounded-lg border px-3 py-1.5 text-sm tabular-nums", field.value === d ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted")}
                    >
                      {t("daysOption", { count: d })}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="wl-url">{t("url")}</Label>
            <Input id="wl-url" type="url" placeholder="https://" aria-invalid={!!formState.errors.url} {...register("url")} />
            <FieldError message={formState.errors.url?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wl-note">{t("note")}</Label>
            <Input id="wl-note" placeholder={t("notePlaceholder")} {...register("note")} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button type="submit" form="wishlist-form" disabled={formState.isSubmitting}>
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
