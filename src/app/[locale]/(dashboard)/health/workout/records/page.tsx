import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Dumbbell, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common";
import { ExerciseProgressSection } from "@/components/health/ExerciseProgressSection";
import { Link, redirect } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/session";
import { todayKey } from "@/lib/date";
import { ONE_RM_MAX_REPS, type ExerciseRecord } from "@/lib/exercises";
import { getExerciseHistory, getExerciseRecords, HISTORY_DAYS } from "@/lib/workout-records";

/**
 * Personal records per exercise, rendered on the server: the aggregate runs in
 * the same region as the database, and only the selected exercise's history
 * crosses the wire.
 */
export default async function WorkoutRecordsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ exercise?: string }>;
}) {
  const [{ locale }, { exercise }, t] = await Promise.all([
    params,
    searchParams,
    getTranslations("Workout"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("records.pageTitle")}>
        <Button variant="outline" size="sm" render={<Link href="/health/workout" />}>
          <ArrowLeft className="size-4" />
          {t("records.backToWorkout")}
        </Button>
      </PageHeader>

      <Suspense fallback={<RecordsSkeleton />}>
        <RecordsContent locale={locale} selected={exercise} />
      </Suspense>
    </div>
  );
}

function RecordsSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Skeleton className="h-72 lg:col-span-1" />
      <Skeleton className="h-72 lg:col-span-2" />
    </div>
  );
}

async function RecordsContent({ locale, selected }: { locale: string; selected?: string }) {
  const [user, t] = await Promise.all([getCurrentUser(), getTranslations("Workout")]);
  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }

  const records = await getExerciseRecords(user.id);
  if (!records.length) {
    return (
      <Card>
        <CardContent className="py-10">
          <EmptyState icon={Trophy} title={t("records.empty")} />
        </CardContent>
      </Card>
    );
  }

  const current =
    records.find((record) => record.canonicalName === selected) ?? records[0];
  const history = await getExerciseHistory(user.id, current.canonicalName, todayKey(user.timezone));

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="size-5 text-primary" />
            {t("records.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1">
            {records.map((record) => (
              <li key={record.canonicalName}>
                <Link
                  href={{
                    pathname: "/health/workout/records",
                    query: { exercise: record.canonicalName },
                  }}
                  className={`flex flex-col gap-0.5 rounded-xl border p-3 transition-colors hover:bg-muted ${
                    record.canonicalName === current.canonicalName
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/70"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{record.name}</span>
                    <Badge variant="outline" className="shrink-0">
                      {t("records.sessions", { count: record.sessions })}
                    </Badge>
                  </span>
                  <span className="text-xs text-muted-foreground">{bestLine(record, t)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="size-5 text-primary" />
            {t("records.progressTitle", { name: current.name })}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("records.rangeNote", { days: HISTORY_DAYS })}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-3 sm:grid-cols-3">
            {current.bodyweight ? (
              <Stat label={t("records.mostReps")} value={t("records.reps", { value: current.bestReps ?? 0 })} />
            ) : (
              <>
                <Stat
                  label={t("records.heaviest")}
                  value={t("records.kg", { value: current.bestWeight ?? 0 })}
                />
                <Stat
                  label={t("records.oneRm")}
                  value={
                    current.bestOneRm === null ? "-" : t("records.kg", { value: current.bestOneRm })
                  }
                />
                <Stat
                  label={t("records.mostReps")}
                  value={t("records.reps", { value: current.bestReps ?? 0 })}
                />
              </>
            )}
          </dl>

          {history.length ? (
            <ExerciseProgressSection points={history} bodyweight={current.bodyweight} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("records.noHistory")}</p>
          )}

          <p className="text-xs text-muted-foreground">
            {t("records.oneRmNote", { max: ONE_RM_MAX_REPS })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-heading text-xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}

/** The headline number for one exercise in the list. */
function bestLine(record: ExerciseRecord, t: Awaited<ReturnType<typeof getTranslations>>) {
  if (record.bodyweight) return t("records.reps", { value: record.bestReps ?? 0 });
  return `${t("records.kg", { value: record.bestWeight ?? 0 })} · ${t("records.oneRm")} ${
    record.bestOneRm === null ? "-" : t("records.kg", { value: record.bestOneRm })
  }`;
}
