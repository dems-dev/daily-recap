"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
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
import { AiLogDialog } from "@/components/ai/AiLogDialog";
import { TransactionDialog } from "@/components/finance/TransactionDialog";
import { TodoDialog } from "@/components/todos/TodoDialog";
import type { HabitsResponse } from "@/components/habits/habit-types";
import { useInvalidate, useJson } from "@/hooks/use-json";
import { useMe } from "@/hooks/use-me";
import { useRouter } from "@/i18n/routing";
import { parseQuickAdd, type QuickAdd } from "@/lib/quick-add";
import { useQuickAddActions } from "./use-quick-add-actions";

type QuickAddContextValue = {
  /** Open the palette, optionally with text already typed. */
  openPalette: (initial?: string) => void;
  openTransaction: () => void;
  openTodo: () => void;
  /** Let AI turn free text into entries (review dialog). */
  openAiLog: (text: string) => void;
};

const QuickAddContext = createContext<QuickAddContextValue | null>(null);

export function useQuickAdd() {
  const ctx = useContext(QuickAddContext);
  if (!ctx) throw new Error("useQuickAdd must be used inside <QuickAddProvider>");
  return ctx;
}

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

export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations("QuickAdd");
  const tNav = useTranslations("Navigation");
  const router = useRouter();
  const invalidate = useInvalidate();
  const onFail = useFailureToast();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [todoOpen, setTodoOpen] = useState(false);
  const [aiText, setAiText] = useState<string | null>(null);

  const { data: me } = useMe(open || transactionOpen || todoOpen);
  const { data: habits } = useJson<HabitsResponse>(open ? "/api/habits" : null);
  const today = me?.today ?? null;
  const { describe, execute } = useQuickAddActions({ today, habits: habits?.habits ?? [], currency: me?.currency });

  const openPalette = useCallback((initial = "") => {
    setInput(initial);
    setOpen(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const parsed = today ? parseQuickAdd(input, today) : null;
  const canUseAi = !!me?.aiEnabled && !parsed && input.trim().length >= 3;

  const run = async (q: QuickAdd) => {
    setBusy(true);
    try {
      toast.add({ title: await execute(q), type: "success" });
      setOpen(false);
      setInput("");
      invalidate();
    } catch (err) {
      onFail(err);
    } finally {
      setBusy(false);
    }
  };

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const pendingHabits = (habits?.habits ?? []).filter((h) => today && !h.days[today]);

  const value = useMemo<QuickAddContextValue>(
    () => ({
      openPalette,
      openTransaction: () => setTransactionOpen(true),
      openTodo: () => setTodoOpen(true),
      openAiLog: (text: string) => setAiText(text),
    }),
    [openPalette]
  );

  return (
    <QuickAddContext.Provider value={value}>
      {children}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[20%] translate-y-0 overflow-hidden p-0 sm:max-w-lg" showCloseButton={false}>
          <DialogTitle className="sr-only">{t("title")}</DialogTitle>
          <DialogDescription className="sr-only">{t("description")}</DialogDescription>
          <Command shouldFilter={!parsed} loop>
            <CommandInput value={input} onValueChange={setInput} placeholder={t("placeholder")} disabled={busy} />
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
                          setOpen(false);
                          setAiText(input.trim());
                          setInput("");
                        }}
                      >
                        <Sparkles />
                        <span className="truncate">{t("logWithAi", { text: input.trim() })}</span>
                      </CommandItem>
                    </CommandGroup>
                  )}
                  <CommandEmpty>{t("noMatch")}</CommandEmpty>
                  <CommandGroup heading={t("actions")}>
                    <CommandItem onSelect={() => { setOpen(false); setTransactionOpen(true); }}>
                      <Wallet /> {t("addTransaction")}
                    </CommandItem>
                    <CommandItem onSelect={() => { setOpen(false); setTodoOpen(true); }}>
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
                    {PAGES.filter((p) => p.key !== "assistant" || me?.aiEnabled).map((p) => (
                      <CommandItem key={p.href} value={`page ${tNav(p.key)}`} onSelect={() => go(p.href)}>
                        <p.icon /> {tNav(p.key)}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
            <p className="border-t px-3 py-2 text-xs text-muted-foreground">{me?.aiEnabled ? t("hintAi") : t("hint")}</p>
          </Command>
        </DialogContent>
      </Dialog>

      <TransactionDialog open={transactionOpen} onOpenChange={setTransactionOpen} defaultDate={today ?? ""} onSaved={invalidate} />
      <TodoDialog open={todoOpen} onOpenChange={setTodoOpen} />
      <AiLogDialog text={aiText} onOpenChange={(o) => !o && setAiText(null)} />
    </QuickAddContext.Provider>
  );
}
