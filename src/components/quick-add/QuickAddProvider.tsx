"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  BookHeart,
  CalendarCheck,
  CheckSquare,
  LayoutDashboard,
  LineChart,
  ListTodo,
  Settings,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { useFailureToast } from "@/components/common";
import { TransactionDialog } from "@/components/finance/TransactionDialog";
import { TodoDialog } from "@/components/todos/TodoDialog";
import { useCategoryLabel, useMoney } from "@/components/finance/shared";
import type { HabitsResponse } from "@/components/habits/habit-types";
import { sendJson, useInvalidate, useJson } from "@/hooks/use-json";
import { useMe } from "@/hooks/use-me";
import { useRouter } from "@/i18n/routing";
import { matchHabit, parseQuickAdd, type QuickAdd } from "@/lib/quick-add";
import type { JournalDTO } from "@/lib/journal";

type QuickAddContextValue = {
  /** Open the palette, optionally with text already typed. */
  openPalette: (initial?: string) => void;
  openTransaction: () => void;
  openTodo: () => void;
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
  { key: "transactions", href: "/finance", icon: Wallet },
  { key: "todos", href: "/productivity/todos", icon: CheckSquare },
  { key: "habits", href: "/productivity/habits", icon: ListTodo },
  { key: "journal", href: "/mind/journal", icon: BookHeart },
  { key: "analytics", href: "/analytics", icon: LineChart },
  { key: "settings", href: "/settings", icon: Settings },
] as const;

export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations("QuickAdd");
  const tNav = useTranslations("Navigation");
  const router = useRouter();
  const invalidate = useInvalidate();
  const onFail = useFailureToast();
  const categoryLabel = useCategoryLabel();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [todoOpen, setTodoOpen] = useState(false);

  const { data: me } = useMe(open || transactionOpen || todoOpen);
  const { data: habits } = useJson<HabitsResponse>(open ? "/api/habits" : null);
  const today = me?.today ?? null;
  const money = useMoney(me?.currency);

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

  const describe = (q: QuickAdd) => {
    switch (q.kind) {
      case "expense":
      case "income":
        return t(q.kind === "expense" ? "previewExpense" : "previewIncome", {
          amount: money(q.amount),
          category: categoryLabel(q.category),
          description: q.description || "—",
          when: q.date === today ? t("today") : q.date,
        });
      case "todo":
        return t("previewTodo", { title: q.title, when: q.dueDate ?? t("noDate") });
      case "habit": {
        const match = matchHabit(habits?.habits ?? [], q.query);
        return match ? t("previewHabit", { name: match.name }) : t("habitNotFound", { query: q.query });
      }
      case "mood":
        return t("previewMood", { mood: t(`moods.${q.mood}`) });
    }
  };

  const run = async (q: QuickAdd) => {
    if (!today) return;
    setBusy(true);
    try {
      switch (q.kind) {
        case "expense":
        case "income":
          await sendJson("/api/finance", "POST", {
            type: q.kind,
            amount: q.amount,
            category: q.category,
            description: q.description,
            date: q.date,
          });
          toast.add({ title: t("doneMoney", { amount: money(q.amount) }), type: "success" });
          break;
        case "todo":
          await sendJson("/api/todos", "POST", { title: q.title, dueDate: q.dueDate });
          toast.add({ title: t("doneTodo", { title: q.title }), type: "success" });
          break;
        case "habit": {
          const match = matchHabit(habits?.habits ?? [], q.query);
          if (!match) {
            toast.add({ title: t("habitNotFound", { query: q.query }), type: "error" });
            return;
          }
          await sendJson(`/api/habits/${match.id}/logs`, "PUT", { date: today, completed: true });
          toast.add({ title: t("doneHabit", { name: match.name }), type: "success" });
          break;
        }
        case "mood": {
          // Keep the rest of today's entry; append the note to the reflection.
          const res = await fetch(`/api/journal/${today}`).then((r) => r.json());
          const entry: JournalDTO | null = res.entry;
          const content = [entry?.content, q.note].filter(Boolean).join("\n");
          await sendJson(`/api/journal/${today}`, "PUT", {
            mood: q.mood,
            title: entry?.title ?? null,
            content,
            gratitude: entry?.gratitude ?? [],
            tags: entry?.tags ?? [],
          });
          toast.add({ title: t("doneMood"), type: "success" });
          break;
        }
      }
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
                        <CommandItem
                          key={h.id}
                          value={`habit ${h.name}`}
                          onSelect={() => run({ kind: "habit", query: h.name })}
                        >
                          <span aria-hidden>{h.icon ?? "•"}</span> {t("checkHabit", { name: h.name })}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  <CommandGroup heading={t("goTo")}>
                    {PAGES.map((p) => (
                      <CommandItem key={p.href} value={`page ${tNav(p.key)}`} onSelect={() => go(p.href)}>
                        <p.icon /> {tNav(p.key)}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
            <p className="border-t px-3 py-2 text-xs text-muted-foreground">{t("hint")}</p>
          </Command>
        </DialogContent>
      </Dialog>

      <TransactionDialog
        open={transactionOpen}
        onOpenChange={setTransactionOpen}
        defaultDate={today ?? ""}
        onSaved={invalidate}
      />
      <TodoDialog open={todoOpen} onOpenChange={setTodoOpen} />
    </QuickAddContext.Provider>
  );
}
