"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  BookHeart,
  Bot,
  CalendarCheck,
  CheckSquare,
  LayoutDashboard,
  LineChart,
  ListTodo,
  Moon,
  Settings,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { useFailureToast } from "@/components/common";
import type { HabitsResponse } from "@/components/habits/habit-types";
import { useInvalidate, useJson } from "@/hooks/use-json";
import { useRouter } from "@/i18n/routing";
import { parseQuickAdd, type QuickAdd } from "@/lib/quick-add";
import { useQuickAddActions } from "./use-quick-add-actions";

const PAGES = [
  { key: "dashboard", href: "/", icon: LayoutDashboard },
  { key: "recap", href: "/recap", icon: CalendarCheck },
  { key: "assistant", href: "/assistant", icon: Bot },
  { key: "transactions", href: "/finance", icon: Wallet },
  { key: "todos", href: "/productivity/todos", icon: CheckSquare },
  { key: "habits", href: "/productivity/habits", icon: ListTodo },
  { key: "journal", href: "/mind/journal", icon: BookHeart },
  { key: "sleep", href: "/health/sleep", icon: Moon },
  { key: "analytics", href: "/analytics", icon: LineChart },
  { key: "settings", href: "/settings", icon: Settings },
] as const;

/**
 * The Ctrl+K palette. Loaded on demand by QuickAddProvider: it pulls in cmdk,
 * so keeping it out of the initial bundle matters on every route.
 */
export default function CommandPalette({
  open,
  onOpenChange,
  input,
  onInputChange,
  today,
  currency,
  aiEnabled,
  onAddTransaction,
  onAddTodo,
  onAiText,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  input: string;
  onInputChange: (value: string) => void;
  today: string | null;
  currency: string | undefined;
  aiEnabled: boolean;
  onAddTransaction: () => void;
  onAddTodo: () => void;
  onAiText: (text: string) => void;
}) {
  const t = useTranslations("QuickAdd");
  const tNav = useTranslations("Navigation");
  const router = useRouter();
  const invalidate = useInvalidate();
  const onFail = useFailureToast();

  const [busy, setBusy] = useState(false);

  const { data: habits } = useJson<HabitsResponse>(open ? "/api/habits" : null);
  const { describe, execute } = useQuickAddActions({ today, habits: habits?.habits ?? [], currency });

  const parsed = today ? parseQuickAdd(input, today) : null;
  const canUseAi = aiEnabled && !parsed && input.trim().length >= 3;

  const run = async (q: QuickAdd) => {
    setBusy(true);
    try {
      toast.add({ title: await execute(q), type: "success" });
      onOpenChange(false);
      onInputChange("");
      invalidate();
    } catch (err) {
      onFail(err);
    } finally {
      setBusy(false);
    }
  };

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const pendingHabits = (habits?.habits ?? []).filter((h) => today && !h.days[today]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[20%] translate-y-0 overflow-hidden p-0 sm:max-w-lg" showCloseButton={false}>
        <DialogTitle className="sr-only">{t("title")}</DialogTitle>
        <DialogDescription className="sr-only">{t("description")}</DialogDescription>
        <Command shouldFilter={!parsed} loop>
          <CommandInput value={input} onValueChange={onInputChange} placeholder={t("placeholder")} disabled={busy} />
          <CommandList className="max-h-[min(60vh,24rem)]">
            {parsed ? (
              <CommandGroup heading={t("quickAdd")}>
                <CommandItem value={`quick ${input}`} onSelect={() => run(parsed)} disabled={busy}>
                  <Zap />
                  <span className="truncate">{describe(parsed)}</span>
                </CommandItem>
              </CommandGroup>
            ) : (
              <>
                {canUseAi && (
                  <CommandGroup heading={t("ai")}>
                    <CommandItem
                      forceMount
                      value={`ai ${input}`}
                      onSelect={() => {
                        onOpenChange(false);
                        onAiText(input.trim());
                        onInputChange("");
                      }}
                    >
                      <Sparkles />
                      <span className="truncate">{t("logWithAi", { text: input.trim() })}</span>
                    </CommandItem>
                  </CommandGroup>
                )}
                <CommandEmpty>{t("noMatch")}</CommandEmpty>
                <CommandGroup heading={t("actions")}>
                  <CommandItem onSelect={() => { onOpenChange(false); onAddTransaction(); }}>
                    <Wallet /> {t("addTransaction")}
                  </CommandItem>
                  <CommandItem onSelect={() => { onOpenChange(false); onAddTodo(); }}>
                    <CheckSquare /> {t("addTodo")}
                  </CommandItem>
                  <CommandItem onSelect={() => go("/mind/journal")}>
                    <BookHeart /> {t("writeJournal")}
                  </CommandItem>
                  <CommandItem onSelect={() => go("/recap")}>
                    <Sparkles /> {t("openRecap")}
                  </CommandItem>
                </CommandGroup>
                {pendingHabits.length > 0 && (
                  <CommandGroup heading={t("habitsToday")}>
                    {pendingHabits.map((h) => (
                      <CommandItem key={h.id} value={`habit ${h.name}`} onSelect={() => run({ kind: "habit", query: h.name })}>
                        <span aria-hidden>{h.icon ?? "•"}</span> {t("checkHabit", { name: h.name })}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                <CommandGroup heading={t("goTo")}>
                  {PAGES.filter((p) => p.key !== "assistant" || aiEnabled).map((p) => (
                    <CommandItem key={p.href} value={`page ${tNav(p.key)}`} onSelect={() => go(p.href)}>
                      <p.icon /> {tNav(p.key)}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
          <p className="border-t px-3 py-2 text-xs text-muted-foreground">{aiEnabled ? t("hintAi") : t("hint")}</p>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
