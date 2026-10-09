"use client";

import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { format, formatDistanceToNow, type Locale } from "date-fns";
import {
  Activity as ActivityIcon,
  ArrowRight,
  BookHeart,
  CheckSquare,
  Flame,
  ListChecks,
  ListTodo,
  Moon,
  Plus,
  Sparkles,
  Timer,
  Wallet,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/ui/count-up";
import { ProgressRing } from "@/components/ui/progress-ring";
import { EmptyState } from "@/components/ui/empty-state";
import { Sparkline } from "@/components/ui/sparkline";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/motion";
import type { WeekDay } from "@/components/dashboard/WeeklyActivityChart";
import { OnboardingCard } from "@/components/dashboard/OnboardingCard";
import { Link } from "@/i18n/routing";
import { useDateLocale } from "@/components/common";
import { useCategoryLabel, useMoney } from "@/components/finance/shared";
import { useQuickAdd } from "@/components/quick-add/QuickAddProvider";
import { TodoItem } from "@/components/todos/TodoItem";
import { useToggleTodo } from "@/components/todos/use-toggle-todo";
import { type Mood } from "@/lib/journal";
import type { TodoDTO } from "@/lib/todos";
import { formatDuration } from "@/lib/sleep";
import { dateKeyToLocalDate } from "@/lib/date";
import { WeeklyPriorities } from "@/components/plans/WeeklyPriorities";
import { MoodIcon } from "@/components/common";

type Activity = {
  id: string;
  type: "income" | "expense" | "journal" | "todo" | "habit";
  title: string;
  amount?: number;
  at: string;
};

type DashboardData = {
  today: string;
  currency: string;
  finance: { income: number; expense: number; balance: number; expenseToday: number };
  habits: { total: number; doneToday: number };
  mind: { mood: Mood | null; hasReflection: boolean };
  productivity: { todosTotal: number; todosCompleted: number };
  sleep: { duration: number; quality: number } | null;
  focus: { todayMinutes: number };
  streak: number;
  week: (WeekDay & { expense: number; habitsRatio: number; tasks: number; mood: number; sleepMin: number; focusMin: number })[];
  todayTodos: TodoDTO[];
  recentActivities: Activity[];
};

/** recharts only matters once the cards are on screen, so it loads after first paint. */
const WeeklyActivityChart = dynamic(
  () => import("@/components/dashboard/WeeklyActivityChart").then((m) => m.WeeklyActivityChart),
  { ssr: false, loading: () => <div className="h-56" /> }
);

type Accent = "finance" | "habit" | "task" | "mind" | "sleep" | "focus";

// Full class strings (no interpolation) so Tailwind can detect them at build time.
const ACCENTS: Record<Accent, { bar: string; chip: string; spark: string }> = {
  finance: { bar: "bg-finance", chip: "bg-finance/12 text-finance", spark: "text-finance" },
  habit: { bar: "bg-habit", chip: "bg-habit/12 text-habit", spark: "text-habit" },
  task: { bar: "bg-task", chip: "bg-task/12 text-task", spark: "text-task" },
  mind: { bar: "bg-mind", chip: "bg-mind/12 text-mind", spark: "text-mind" },
  sleep: { bar: "bg-sleep", chip: "bg-sleep/12 text-sleep", spark: "text-sleep" },
  focus: { bar: "bg-focus", chip: "bg-focus/12 text-focus", spark: "text-focus" },
};

function StatCard({
  title,
  icon: Icon,
  href,
  value,
  detail,
  accent,
  trend,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  value: React.ReactNode;
  detail: React.ReactNode;
  accent: Accent;
  trend?: number[];
}) {
  const a = ACCENTS[accent];
  return (
    <StaggerItem className="h-full">
      <Link
        href={href}
        className="group block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Card className="relative h-full gap-0 transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-xl">
          <span
            className={`absolute inset-x-0 top-0 h-1 origin-top transition-transform duration-300 group-hover:scale-y-[2] ${a.bar}`}
            aria-hidden
          />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <span
              className={`grid size-9 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${a.chip}`}
            >
              <Icon className="size-[18px]" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="font-heading text-2xl font-bold tabular-nums">{value}</div>
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">{detail}</p>
          </CardContent>
          {trend && trend.some((v) => v > 0) ? (
            <div className={`mt-2 px-1 ${a.spark}`}>
              <Sparkline values={trend} height={34} />
            </div>
          ) : null}
        </Card>
      </Link>
    </StaggerItem>
  );
}

function HeroChip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/20 backdrop-blur-sm ${className ?? ""}`}
    >
      {children}
    </span>
  );
}

function pct(parts: number[]) {
  return parts.length ? Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100) : 0;
}

export function DashboardView({ data, firstName }: { data: DashboardData; firstName: string }) {
  const t = useTranslations("Dashboard");
  const tJournal = useTranslations("Journal");
  const money = useMoney(data.currency);
  const categoryLabel = useCategoryLabel();
  const dateLocale = useDateLocale();
  const { openPalette, openTransaction, openTodo } = useQuickAdd();
  const toggleTodo = useToggleTodo();
  const locale = useLocale();
  const reduce = useReducedMotion();

  const getGreeting = () => {
    const hour = new Date().getHours();
    let timeOfDay = t("morning");
    if (hour >= 11 && hour < 15) timeOfDay = t("afternoon");
    else if (hour >= 15 && hour < 18) timeOfDay = t("evening");
    else if (hour >= 18 || hour < 4) timeOfDay = t("night");
    return t("greeting", { time: timeOfDay, name: firstName });
  };

  const recapPending = !data.mind.mood;
  const formattedDate = format(new Date(), "EEEE, d MMMM yyyy", { locale: dateLocale });

  // Today's completion: average of the signals the user actually has in play.
  const parts: number[] = [];
  if (data.habits.total > 0) parts.push(data.habits.doneToday / data.habits.total);
  const hasTasks = data.productivity.todosTotal > 0;
  if (hasTasks) parts.push(data.productivity.todosCompleted / data.productivity.todosTotal);
  parts.push(data.mind.mood ? 1 : 0);
  parts.push(data.sleep ? 1 : 0);
  const percent = pct(parts);

  // What percent they'd hit by clearing today's remaining tasks (powers the nudge).
  const partsIfTasksDone = parts.slice();
  if (hasTasks) partsIfTasksDone[data.habits.total > 0 ? 1 : 0] = 1;
  const potentialPercent = pct(partsIfTasksDone);
  const tasksLeft = data.productivity.todosTotal - data.productivity.todosCompleted;

  const week = data.week ?? [];

  const isNewUser =
    data.habits.total === 0 &&
    data.productivity.todosTotal === 0 &&
    data.finance.income === 0 &&
    data.finance.expense === 0 &&
    !data.mind.mood &&
    data.streak === 0;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <FadeIn>
        <div className="hero-surface relative overflow-hidden rounded-3xl px-6 py-7 text-white shadow-xl sm:px-8 sm:py-8">
          <motion.div
            className="hero-blob pointer-events-none absolute -right-10 -top-20 size-52 rounded-full bg-white/20"
            animate={reduce ? undefined : { x: [0, 18, 0], y: [0, 12, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="hero-blob pointer-events-none absolute -bottom-24 left-10 size-52 rounded-full bg-fuchsia-400/25"
            animate={reduce ? undefined : { x: [0, -16, 0], y: [0, -10, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-3">
              <p className="text-sm font-medium text-white/70" suppressHydrationWarning>
                {formattedDate}
              </p>
              <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl" suppressHydrationWarning>
                {getGreeting()}
              </h1>
              <p className="max-w-md text-sm text-white/80">
                {tasksLeft > 0
                  ? t("nudgeTasks", { count: tasksLeft, percent: potentialPercent })
                  : data.productivity.todosTotal > 0
                    ? t("allDoneToday")
                    : recapPending
                      ? t("recapPending")
                      : t("recapDone")}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <HeroChip className="bg-amber-400/25 ring-amber-200/30">
                  <Flame className="size-3.5 text-amber-200" />
                  {data.streak > 0 ? t("streakLabel", { days: data.streak }) : t("streakStart")}
                </HeroChip>
                <HeroChip>
                  <CheckSquare className="size-3.5" />
                  {data.productivity.todosCompleted}/{data.productivity.todosTotal} {t("productivity")}
                </HeroChip>
                <HeroChip>
                  <ListTodo className="size-3.5" />
                  {data.habits.doneToday}/{data.habits.total} {t("habits")}
                </HeroChip>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <HeroWeekBars week={week} locale={dateLocale} />
              <ProgressRing value={percent}>
                <div>
                  <div className="font-heading text-3xl font-bold">
                    <CountUp value={percent} format={(n) => `${Math.round(n)}%`} />
                  </div>
                  <div className="mx-auto max-w-[6rem] text-[11px] leading-tight text-white/70">
                    {t("todayProgress")}
                  </div>
                </div>
              </ProgressRing>
            </div>
          </div>
        </div>
      </FadeIn>

      {isNewUser ? (
        <FadeIn delay={0.05}>
          <OnboardingCard name={firstName} />
        </FadeIn>
      ) : null}

      {/* Quick actions */}
      <FadeIn delay={0.08} className="-mt-2 flex flex-wrap gap-2">
        <Button className="gap-2 rounded-full" onClick={() => openPalette()}>
          <Zap className="h-4 w-4" /> {t("quickAdd")}
        </Button>
        <Button variant="outline" className="gap-2 rounded-full" onClick={openTransaction}>
          <Wallet className="h-4 w-4" /> {t("addTransaction")}
        </Button>
        <Button variant="outline" className="gap-2 rounded-full" onClick={openTodo}>
          <Plus className="h-4 w-4" /> {t("addTask")}
        </Button>
        <Button
          variant="outline"
          className="gap-2 rounded-full"
          nativeButton={false}
          render={<Link href="/recap" />}
        >
          <Sparkles className="h-4 w-4" /> {t("openRecap")}
        </Button>
      </FadeIn>

      {/* Stat cards */}
      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          title={t("finance")}
          icon={Wallet}
          href="/finance"
          accent="finance"
          value={<CountUp value={data.finance.balance} format={money} />}
          detail={t("expenseToday", { amount: money(data.finance.expenseToday) })}
          trend={week.map((d) => d.expense)}
        />
        <StatCard
          title={t("habits")}
          icon={ListTodo}
          href="/productivity/habits"
          accent="habit"
          value={`${data.habits.doneToday} / ${data.habits.total}`}
          detail={data.habits.total === 0 ? t("noHabits") : t("habitsToday")}
          trend={week.map((d) => Math.round(d.habitsRatio * 100))}
        />
        <StatCard
          title={t("productivity")}
          icon={CheckSquare}
          href="/productivity/todos"
          accent="task"
          value={`${data.productivity.todosCompleted} / ${data.productivity.todosTotal}`}
          detail={t("tasksToday")}
          trend={week.map((d) => d.tasks)}
        />
        <StatCard
          title={t("mind")}
          icon={BookHeart}
          href="/mind/journal"
          accent="mind"
          value={
            data.mind.mood ? (
              <span>
                <MoodIcon mood={data.mind.mood} className="mr-2" /> {tJournal(`moods.${data.mind.mood}`)}
              </span>
            ) : (
              t("noLog")
            )
          }
          detail={data.mind.hasReflection ? t("reflectionWritten") : t("noReflection")}
          trend={week.map((d) => d.mood)}
        />
        <StatCard
          title={t("sleep")}
          icon={Moon}
          href="/health/sleep"
          accent="sleep"
          value={data.sleep ? formatDuration(data.sleep.duration, locale) : t("noLog")}
          detail={data.sleep ? t("sleepQuality", { value: data.sleep.quality }) : t("sleepHint")}
          trend={week.map((d) => d.sleepMin)}
        />
        <StatCard
          title={t("focus")}
          icon={Timer}
          href="/productivity/pomodoro"
          accent="focus"
          value={
            data.focus.todayMinutes > 0 ? (
              <CountUp value={data.focus.todayMinutes} format={(n) => `${Math.round(n)}m`} />
            ) : (
              t("noLog")
            )
          }
          detail={data.focus.todayMinutes > 0 ? t("focusToday") : t("noFocus")}
          trend={week.map((d) => d.focusMin)}
        />
      </Stagger>

      {/* Weekly activity + priorities */}
      <div className="grid gap-4 lg:grid-cols-3">
        <FadeIn delay={0.1} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{t("weeklyActivity")}</CardTitle>
            </CardHeader>
            <CardContent>
              <WeeklyActivityChart data={week} />
            </CardContent>
          </Card>
        </FadeIn>
        <FadeIn delay={0.16}>
          <WeeklyPriorities />
        </FadeIn>
      </div>

      {/* Tasks + activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <FadeIn delay={0.1}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("todayTasks")}</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1"
                nativeButton={false}
                render={<Link href="/productivity/todos" />}
              >
                {t("seeAll")} <ArrowRight className="size-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {data.todayTodos.length === 0 ? (
                <EmptyState
                  icon={ListChecks}
                  title={t("noTasks")}
                  description={tasksLeft <= 0 ? t("allCaughtUp") : undefined}
                  action={
                    <Button size="sm" variant="outline" className="gap-1.5 rounded-full" onClick={openTodo}>
                      <Plus className="size-4" /> {t("addTask")}
                    </Button>
                  }
                />
              ) : (
                <ul className="divide-y">
                  {data.todayTodos.map((todo) => (
                    <TodoItem key={todo.id} todo={todo} today={data.today} onToggle={toggleTodo} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.16}>
          <Card>
            <CardHeader>
              <CardTitle>{t("activityFeed")}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentActivities.length === 0 ? (
                <EmptyState icon={ActivityIcon} title={t("noActivity")} description={t("activityHint")} />
              ) : (
                <ul className="space-y-4">
                  {data.recentActivities.map((activity) => {
                    const isMoney = activity.type === "income" || activity.type === "expense";
                    const title = isMoney
                      ? categoryLabel(activity.title)
                      : activity.title || t(`activity.${activity.type}`);
                    return (
                      <li key={activity.id} className="flex items-center gap-4">
                        <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="truncate text-sm font-medium leading-none">{title}</p>
                          <p className="text-sm text-muted-foreground">
                            {t(`activity.${activity.type}`)}
                            {isMoney && activity.amount !== undefined && ` · ${money(activity.amount)}`}
                            {" · "}
                            <span suppressHydrationWarning>
                              {formatDistanceToNow(new Date(activity.at), { addSuffix: true, locale: dateLocale })}
                            </span>
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}

/** Seven slim bars of daily activity, sitting left of the progress ring in the hero. */
function HeroWeekBars({ week, locale }: { week: DashboardData["week"]; locale: Locale }) {
  const reduce = useReducedMotion();
  if (!week.length) return null;
  const today = week[week.length - 1]?.date;
  return (
    <div className="hidden items-end gap-1.5 sm:flex" aria-hidden>
      {week.map((d, i) => (
        <div key={d.date} className="flex flex-col items-center gap-1">
          <div className="flex h-12 w-2.5 items-end overflow-hidden rounded-full bg-white/15">
            <motion.div
              className={`w-full rounded-full ${d.date === today ? "bg-white" : "bg-white/55"}`}
              style={{ height: `${Math.max(6, d.activity)}%`, transformOrigin: "bottom" }}
              initial={reduce ? false : { scaleY: 0 }}
              animate={reduce ? false : { scaleY: 1 }}
              transition={{ delay: 0.35 + i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <span className="text-[9px] uppercase text-white/55">
            {format(dateKeyToLocalDate(d.date), "EEEEE", { locale })}
          </span>
        </div>
      ))}
    </div>
  );
}
