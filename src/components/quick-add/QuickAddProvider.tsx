"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useMe } from "@/hooks/use-me";
import { useInvalidate } from "@/hooks/use-json";

/**
 * Only the context and the Ctrl+K listener load eagerly - this provider sits in
 * the dashboard layout, so it runs on every route. The palette (cmdk) and the
 * three dialogs (react-hook-form + zod + date picker) are pulled in the first
 * time they are opened; before that they cost nothing.
 */
const CommandPalette = dynamic(() => import("./CommandPalette"), { ssr: false });
const TransactionDialog = dynamic(
  () => import("@/components/finance/TransactionDialog").then((m) => m.TransactionDialog),
  { ssr: false }
);
const TodoDialog = dynamic(
  () => import("@/components/todos/TodoDialog").then((m) => m.TodoDialog),
  { ssr: false }
);
const AiLogDialog = dynamic(
  () => import("@/components/ai/AiLogDialog").then((m) => m.AiLogDialog),
  { ssr: false }
);

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

export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const invalidate = useInvalidate();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [todoOpen, setTodoOpen] = useState(false);
  const [aiText, setAiText] = useState<string | null>(null);

  // Once something has been opened we keep it mounted, so closing still animates.
  const [paletteUsed, setPaletteUsed] = useState(false);
  const [transactionUsed, setTransactionUsed] = useState(false);
  const [todoUsed, setTodoUsed] = useState(false);
  const [aiUsed, setAiUsed] = useState(false);

  const { data: me } = useMe(open || transactionOpen || todoOpen);
  const today = me?.today ?? null;

  const openPalette = useCallback((initial = "") => {
    setInput(initial);
    setPaletteUsed(true);
    setOpen(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteUsed(true);
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo<QuickAddContextValue>(
    () => ({
      openPalette,
      openTransaction: () => {
        setTransactionUsed(true);
        setTransactionOpen(true);
      },
      openTodo: () => {
        setTodoUsed(true);
        setTodoOpen(true);
      },
      openAiLog: (text: string) => {
        setAiUsed(true);
        setAiText(text);
      },
    }),
    [openPalette]
  );

  return (
    <QuickAddContext.Provider value={value}>
      {children}

      {paletteUsed && (
        <CommandPalette
          open={open}
          onOpenChange={setOpen}
          input={input}
          onInputChange={setInput}
          today={today}
          currency={me?.currency}
          aiEnabled={!!me?.aiEnabled}
          onAddTransaction={() => {
            setTransactionUsed(true);
            setTransactionOpen(true);
          }}
          onAddTodo={() => {
            setTodoUsed(true);
            setTodoOpen(true);
          }}
          onAiText={setAiText}
        />
      )}

      {transactionUsed && (
        <TransactionDialog
          open={transactionOpen}
          onOpenChange={setTransactionOpen}
          defaultDate={today ?? ""}
          onSaved={invalidate}
        />
      )}
      {todoUsed && <TodoDialog open={todoOpen} onOpenChange={setTodoOpen} />}
      {aiUsed && <AiLogDialog text={aiText} onOpenChange={(o) => !o && setAiText(null)} />}
    </QuickAddContext.Provider>
  );
}
