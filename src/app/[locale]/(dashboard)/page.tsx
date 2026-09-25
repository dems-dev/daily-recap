"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { formatDistanceToNow } from "date-fns";
import { enUS, id as idLocale } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Dumbbell, BookHeart, CheckSquare, Plus, Droplet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { useJson } from "@/hooks/use-json";
import { useCategoryLabel, useMoney } from "@/components/finance/shared";

type Activity = {
  id: string;
  type: "income" | "expense" | "workout" | "meal" | "journal" | "todo";
  title: string;
  amount?: number;
  at: string;
};

type DashboardData = {
  today: string;
  currency: string;
  finance: { income: number; expense: number; balance: number };
  health: { workoutsCount: number; waterGlasses: number; waterTarget: number; sleepDuration: number; sleepQuality: number };
  mind: { mood: string; gratitudeCount: number };
  productivity: { todosTotal: number; todosCompleted: number };
  recentActivities: Activity[];
};

export default function DashboardPage() {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const { data: session } = useSession();
  const { data, error } = useJson<DashboardData>("/api/dashboard");
  const money = useMoney(data?.currency);
  const categoryLabel = useCategoryLabel();
  const dateLocale = locale === "id" ? idLocale : enUS;

  const getGreeting = () => {
    const hour = new Date().getHours();
    let timeOfDay = t("morning");
    if (hour >= 12 && hour < 15) timeOfDay = t("afternoon");
    else if (hour >= 15 && hour < 18) timeOfDay = t("evening");
    else if (hour >= 18) timeOfDay = t("night");

    return t("greeting", { time: timeOfDay, name: session?.user?.name || "User" });
  };

  if (error) {
    return <div className="p-8 text-sm text-destructive">{t("loadFailed")}</div>;
  }

  if (!data) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{getGreeting()}</h1>
        <p className="text-muted-foreground mt-1">&ldquo;The secret of getting ahead is getting started.&rdquo;</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">{t("quickActions")}</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" nativeButton={false} render={<Link href="/finance" />}><Plus className="w-4 h-4"/> Expense</Button>
          <Button variant="outline" className="gap-2"><BookHeart className="w-4 h-4"/> Journal</Button>
          <Button variant="outline" className="gap-2"><Dumbbell className="w-4 h-4"/> Workout</Button>
          <Button variant="outline" className="gap-2"><CheckSquare className="w-4 h-4"/> Task</Button>
          <Button variant="outline" className="gap-2"><Droplet className="w-4 h-4 text-blue-500"/> +1 Water</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Finance Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("finance")}</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{money(data.finance.balance)}</div>
            <p className="text-xs text-muted-foreground mt-1 tabular-nums">
              {t("incomeExpense", { income: money(data.finance.income), expense: money(data.finance.expense) })}
            </p>
          </CardContent>
        </Card>

        {/* Health Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("health")}</CardTitle>
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.health.workoutsCount > 0 ? t("workoutDone") : t("restDay")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("water", { glasses: data.health.waterGlasses, target: data.health.waterTarget })}
            </p>
          </CardContent>
        </Card>

        {/* Mind Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("mind")}</CardTitle>
            <BookHeart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.mind.mood !== "none" ? data.mind.mood : t("noLog")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("gratitude", { count: data.mind.gratitudeCount })}
            </p>
          </CardContent>
        </Card>

        {/* Productivity Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("productivity")}</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {data.productivity.todosCompleted} / {data.productivity.todosTotal}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("tasksToday")}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>{t("activityFeed")}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noActivity")}</p>
            ) : (
              <div className="space-y-4">
                {data.recentActivities.map((activity) => {
                  const isMoney = activity.type === "income" || activity.type === "expense";
                  const title = isMoney ? categoryLabel(activity.title) : activity.title || t(`activity.${activity.type}`);
                  return (
                    <div key={activity.id} className="flex items-center gap-4">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <div className="flex-1 space-y-1 min-w-0">
                        <p className="text-sm font-medium leading-none truncate">{title}</p>
                        <p className="text-sm text-muted-foreground">
                          {t(`activity.${activity.type}`)}
                          {isMoney && activity.amount !== undefined && ` · ${money(activity.amount)}`}
                          {" · "}
                          {formatDistanceToNow(new Date(activity.at), { addSuffix: true, locale: dateLocale })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>{t("calendar")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center p-8 text-muted-foreground border rounded-lg bg-muted/20">
              Mini Calendar Widget Placeholder
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
