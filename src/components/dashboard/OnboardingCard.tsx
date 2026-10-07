"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, BookHeart, CheckSquare, ListTodo, Sparkles, Wallet, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/routing";
import { useQuickAdd } from "@/components/quick-add/QuickAddProvider";

const DISMISS_KEY = "dr.onboarding.dismissed";

type Step = {
  key: "stepTransaction" | "stepTask" | "stepHabit" | "stepJournal";
  icon: typeof Wallet;
  chip: string;
  onClick?: () => void;
  href?: string;
};

/** First-run checklist, shown only to a brand-new account. Dismissible (per browser). */
export function OnboardingCard({ name }: { name?: string }) {
  const t = useTranslations("Dashboard");
  const { openTransaction, openTodo } = useQuickAdd();
  // This card only mounts client-side (after the dashboard data loads), so reading
  // localStorage in the initializer is safe and avoids a post-mount setState.
  const [dismissed, setDismissed] = React.useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const steps: Step[] = [
    { key: "stepTransaction", icon: Wallet, chip: "bg-finance/12 text-finance", onClick: openTransaction },
    { key: "stepTask", icon: CheckSquare, chip: "bg-task/12 text-task", onClick: () => openTodo() },
    { key: "stepHabit", icon: ListTodo, chip: "bg-habit/12 text-habit", href: "/productivity/habits" },
    { key: "stepJournal", icon: BookHeart, chip: "bg-mind/12 text-mind", href: "/mind/journal" },
  ];

  return (
    <Card className="relative overflow-hidden">
      <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-fuchsia-500" aria-hidden />
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("onboardingDismiss")}
        className="absolute right-3 top-3 grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" />
      </button>
      <CardContent className="pt-1">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">
            <Sparkles className="size-5" />
          </span>
          <div>
            <h2 className="font-heading text-lg font-bold">
              {name ? `${t("welcomeTitle")}, ${name}` : t("welcomeTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("welcomeSubtitle")}</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {steps.map((s) => {
            const inner = (
              <>
                <span className={`grid size-9 place-items-center rounded-xl ${s.chip}`}>
                  <s.icon className="size-[18px]" />
                </span>
                <span className="flex-1 text-sm font-medium">{t(s.key)}</span>
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover/step:translate-x-0.5" />
              </>
            );
            const cls =
              "group/step flex items-center gap-3 rounded-xl border border-border/70 bg-background/40 px-3 py-2.5 text-left transition-colors hover:bg-muted/60";
            return s.href ? (
              <Link key={s.key} href={s.href} className={cls}>
                {inner}
              </Link>
            ) : (
              <button key={s.key} type="button" onClick={s.onClick} className={cls}>
                {inner}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
