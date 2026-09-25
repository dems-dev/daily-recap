"use client";

import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, BookHeart, CheckSquare, ListTodo, Plus, Sparkles, Wallet, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/routing";
import { useJson } from "@/hooks/use-json";
import { useDateLocale } from "@/components/common";
import { useCategoryLabel, useMoney } from "@/components/finance/shared";
import { useQuickAdd } from "@/components/quick-add/QuickAddProvider";
import { TodoItem } from "@/components/todos/TodoItem";
import { useToggleTodo } from "@/components/todos/use-toggle-todo";
import { MOOD_EMOJI, type Mood } from "@/lib/journal";
import type { TodoDTO } from "@/lib/todos";

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
  todayTodos: TodoDTO[];
  recentActivities: Activity[];
};

function StatCard({
  title,
  icon: Icon,
  href,
  value,
  detail,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  value: React.ReactNode;
  detail: React.ReactNode;
}) {
  return (
    <Link href={href} className="group rounded-xl focus-visible:outline-2 focus-visible:outline-ring">
      <Card className="h-full transition-colors group-hover:bg-muted/40">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums">{value}</div>
          <p className="mt-1 text-xs text-muted-foreground tabular-nums">{detail}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const t = useTranslations("Dashboard");
  const tJournal = useTranslations("Journal");
  const { data: session } = useSession();
  const { data, error } = useJson<DashboardData>("/api/dashboard");
  const money = useMoney(data?.currency);
  const categoryLabel = useCategoryLabel();
  const dateLocale = useDateLocale();
  const { openPalette, openTransaction, openTodo } = useQuickAdd();
  const toggleTodo = useToggleTodo();

  const getGreeting = () => {
    const hour = new Date().getHours();
    let timeOfDay = t("morning");
    if (hour >= 11 && hour < 15) timeOfDay = t("afternoon");
    else if (hour >= 15 && hour < 18) timeOfDay = t("evening");
    else if (hour >= 18 || hour < 4) timeOfDay = t("night");
    return t("greeting", { time: timeOfDay, name: session?.user?.name?.split(" ")[0] || "" });
  };

  if (error) {
    return <div className="p-8 text-sm text-destructive">{t("loadFailed")}</div>;
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  const recapPending = !data.mind.mood;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" suppressHydrationWarning>
          {getGreeting()}
        </h1>
        <p className="mt-1 text-muted-foreground">{recapPending ? t("recapPending") : t("recapDone")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button className="gap-2" onClick={() => openPalette()}>
          <Zap className="h-4 w-4" /> {t("quickAdd")}
        </Button>
        <Button variant="outline" className="gap-2" onClick={openTransaction}>
          <Wallet className="h-4 w-4" /> {t("addTransaction")}
        </Button>
        <Button variant="outline" className="gap-2" onClick={openTodo}>
          <Plus className="h-4 w-4" /> {t("addTask")}
        </Button>
        <Button variant="outline" className="gap-2" nativeButton={false} render={<Link href="/recap" />}>
          <Sparkles className="h-4 w-4" /> {t("openRecap")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("finance")}
          icon={Wallet}
          href="/finance"
          value={money(data.finance.balance)}
          detail={t("expenseToday", { amount: money(data.finance.expenseToday) })}
        />
        <StatCard
          title={t("habits")}
          icon={ListTodo}
          href="/productivity/habits"
          value={`${data.habits.doneToday} / ${data.habits.total}`}
          detail={data.habits.total === 0 ? t("noHabits") : t("habitsToday")}
        />
        <StatCard
          title={t("productivity")}
          icon={CheckSquare}
          href="/productivity/todos"
          value={`${data.productivity.todosCompleted} / ${data.productivity.todosTotal}`}
          detail={t("tasksToday")}
        />
        <StatCard
          title={t("mind")}
          icon={BookHeart}
          href="/mind/journal"
          value={
            data.mind.mood ? (
              <span>
                <span aria-hidden>{MOOD_EMOJI[data.mind.mood]}</span> {tJournal(`moods.${data.mind.mood}`)}
              </span>
            ) : (
              t("noLog")
            )
          }
          detail={data.mind.hasReflection ? t("reflectionWritten") : t("noReflection")}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("todayTasks")}</CardTitle>
            <Button variant="ghost" size="sm" className="gap-1" nativeButton={false} render={<Link href="/productivity/todos" />}>
              {t("seeAll")} <ArrowRight className="size-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {data.todayTodos.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noTasks")}</p>
            ) : (
              <ul className="divide-y">
                {data.todayTodos.map((todo) => (
                  <TodoItem key={todo.id} todo={todo} today={data.today} onToggle={toggleTodo} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("activityFeed")}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noActivity")}</p>
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
      </div>
    </div>
  );
}
