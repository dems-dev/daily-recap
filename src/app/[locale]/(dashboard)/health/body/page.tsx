"use client";

import { useState, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Scale, Plus, Ruler, Activity as ActivityIcon, Flame, Dumbbell, Apple, HeartPulse, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, useDateFormat } from "@/components/common";
import { EmptyState } from "@/components/ui/empty-state";
import { useJson } from "@/hooks/use-json";
import { type BodyMetricDTO } from "@/lib/body-metrics";
import { BodyMetricDialog } from "@/components/health/BodyMetricDialog";
import {
  bmi as calcBmi,
  bmiCategory,
  goalForCategory,
  idealWeightRange,
  bmr as calcBmr,
  tdee as calcTdee,
  targetCalories,
  macros as calcMacros,
  ageFromBirthYear,
  type Sex,
  type ActivityLevel,
  type Goal,
} from "@/lib/body-insights";
import {
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const PROFILE_KEY = "dr.body.profile";
type Profile = { sex?: Sex; birthYear?: number; activity?: ActivityLevel; target?: number };
const ACTIVITY_LEVELS: ActivityLevel[] = ["sedentary", "light", "moderate", "active", "veryActive"];

const CAT_COLOR: Record<string, string> = {
  underweight: "#60a5fa",
  normal: "var(--viz-good)",
  overweight: "#f59e0b",
  obese: "#ef4444",
};

function round(n: number, d = 1) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function StatCard({ label, value, unit, icon: Icon }: { label: string; value: React.ReactNode; unit?: string; icon: typeof Scale }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="font-heading text-2xl font-bold tabular-nums">
          {value}
          {unit ? <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default function BodyMetricsPage() {
  const t = useTranslations("Health");
  const { data, loading } = useJson<{ metrics: BodyMetricDTO[] }>("/api/body");
  const format = useDateFormat();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Start empty (matches SSR), then hydrate from localStorage after mount to
  // avoid a hydration mismatch on the form values.
  const [profile, setProfile] = useState<Profile>({});
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setProfile(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }, []);
  const patch = (p: Partial<Profile>) =>
    setProfile((prev) => {
      const next = { ...prev, ...p };
      try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });

  const metrics = data?.metrics;
  const sorted = useMemo(() => (metrics ? [...metrics].sort((a, b) => a.date.localeCompare(b.date)) : []), [metrics]);
  const latest = metrics?.[0];
  const latestWeight = latest?.weight ?? null;
  // Height is a stable attribute — take the most recent entry that has one.
  const latestHeight = useMemo(() => {
    for (const m of sorted.slice().reverse()) if (m.height) return m.height;
    return null;
  }, [sorted]);

  const range = latestHeight ? idealWeightRange(latestHeight) : null;
  const bmiValue = latestWeight && latestHeight ? calcBmi(latestWeight, latestHeight) : null;
  const category = bmiValue !== null ? bmiCategory(bmiValue) : null;

  // Goal: follow the target weight if set, else the BMI category.
  const goal: Goal | null = (() => {
    if (latestWeight && profile.target) {
      if (latestWeight > profile.target + 0.5) return "lose";
      if (latestWeight < profile.target - 0.5) return "gain";
      return "maintain";
    }
    return category ? goalForCategory(category) : null;
  })();

  const age = profile.birthYear ? ageFromBirthYear(profile.birthYear) : null;
  const canCalc = Boolean(latestWeight && latestHeight && profile.sex && age && profile.activity);
  const bmrValue = canCalc ? calcBmr(profile.sex as Sex, latestWeight as number, latestHeight as number, age as number) : null;
  const tdeeValue = bmrValue !== null ? calcTdee(bmrValue, profile.activity as ActivityLevel) : null;
  const calTarget = tdeeValue !== null && goal ? targetCalories(tdeeValue, goal) : null;
  const macro = calTarget !== null && latestWeight ? calcMacros(calTarget, latestWeight) : null;

  const chartData = sorted.filter((m) => m.weight != null).map((m) => ({ ...m, label: format(m.date, "d MMM") }));

  const bmiMarker = bmiValue !== null ? Math.max(0, Math.min(100, ((bmiValue - 15) / 20) * 100)) : 0;

  const recGoal = goal ?? "maintain";
  const recExercise = t.raw(`recommendations.${recGoal}.exercise`) as string[];
  const recDiet = t.raw(`recommendations.${recGoal}.diet`) as string[];
  const recLifestyle = t.raw(`recommendations.${recGoal}.lifestyle`) as string[];

  return (
    <div className="space-y-6">
      <PageHeader title={t("bodyTitle")}>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("logBody")}
        </Button>
      </PageHeader>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("latestWeight")}
          icon={Scale}
          value={loading ? "…" : latestWeight ?? "—"}
          unit={latestWeight ? "kg" : undefined}
        />
        <StatCard
          label={t("latestHeight")}
          icon={Ruler}
          value={loading ? "…" : latestHeight ?? "—"}
          unit={latestHeight ? "cm" : undefined}
        />
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("bmi")}</CardTitle>
            <HeartPulse className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="font-heading text-2xl font-bold tabular-nums">
                {bmiValue !== null ? round(bmiValue) : "—"}
              </span>
              {category ? (
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: CAT_COLOR[category] }}
                >
                  {t(`cat.${category}`)}
                </span>
              ) : null}
            </div>
          </CardContent>
        </Card>
        <StatCard
          label={t("latestBodyFat")}
          icon={ActivityIcon}
          value={loading ? "…" : latest?.bodyFat ?? "—"}
          unit={latest?.bodyFat ? "%" : undefined}
        />
      </div>

      {/* BMI scale + ideal weight */}
      {bmiValue !== null && range ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("insightsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("bmi")}</span>
                <span className="font-medium tabular-nums">{round(bmiValue)}</span>
              </div>
              <div className="relative h-3 w-full overflow-hidden rounded-full">
                <div className="absolute inset-0 flex">
                  <div style={{ width: "17.5%", background: CAT_COLOR.underweight }} />
                  <div style={{ width: "32.5%", background: CAT_COLOR.normal }} />
                  <div style={{ width: "25%", background: CAT_COLOR.overweight }} />
                  <div style={{ width: "25%", background: CAT_COLOR.obese }} />
                </div>
                <div
                  className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground shadow"
                  style={{ left: `${bmiMarker}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>15</span>
                <span>18.5</span>
                <span>25</span>
                <span>30</span>
                <span>35</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/70 p-3">
                <p className="text-xs text-muted-foreground">{t("idealWeight")}</p>
                <p className="font-heading text-lg font-bold tabular-nums">
                  {t("idealRange", { min: Math.round(range.min), max: Math.round(range.max) })}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 p-3">
                <p className="text-xs text-muted-foreground">{t(`cat.${category}`)}</p>
                <p className="text-sm font-medium">
                  {category === "normal"
                    ? t("inHealthyRange")
                    : latestWeight && latestWeight > range.max
                      ? t("toHealthyLose", { kg: round(latestWeight - range.max) })
                      : latestWeight && latestWeight < range.min
                        ? t("toHealthyGain", { kg: round(range.min - latestWeight) })
                        : t("inHealthyRange")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Your details + calories */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("yourDetails")}</CardTitle>
            <p className="text-xs text-muted-foreground">{t("yourDetailsHint")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("sex")}</Label>
              <div className="flex gap-2">
                {(["male", "female"] as Sex[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => patch({ sex: s })}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      profile.sex === s ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-muted"
                    }`}
                  >
                    {t(s === "male" ? "sexMale" : "sexFemale")}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="birthYear">{t("birthYear")}</Label>
                <Input
                  id="birthYear"
                  type="number"
                  inputMode="numeric"
                  placeholder="1998"
                  value={profile.birthYear ?? ""}
                  onChange={(e) => patch({ birthYear: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target">
                  {t("targetWeight")} <span className="text-muted-foreground">({t("optional")})</span>
                </Label>
                <Input
                  id="target"
                  type="number"
                  step="0.1"
                  value={profile.target ?? ""}
                  onChange={(e) => patch({ target: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="activity">{t("activity")}</Label>
              <select
                id="activity"
                value={profile.activity ?? ""}
                onChange={(e) => patch({ activity: (e.target.value || undefined) as ActivityLevel | undefined })}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="" disabled>
                  —
                </option>
                {ACTIVITY_LEVELS.map((a) => (
                  <option key={a} value={a}>
                    {t(`act.${a}`)}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="size-5 text-primary" /> {t("targetCalories")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {canCalc && calTarget !== null && macro ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">{t("bmr")}</p>
                    <p className="font-heading text-lg font-bold tabular-nums">{Math.round(bmrValue as number)}</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">{t("tdee")}</p>
                    <p className="font-heading text-lg font-bold tabular-nums">{Math.round(tdeeValue as number)}</p>
                  </div>
                  <div className="rounded-xl bg-primary/10 p-3 text-primary">
                    <p className="text-xs opacity-80">{t("targetCalories")}</p>
                    <p className="font-heading text-lg font-bold tabular-nums">{Math.round(calTarget)}</p>
                  </div>
                </div>
                <p className="text-center text-xs text-muted-foreground">{t("kcal")}</p>
                <div>
                  <p className="mb-2 text-sm font-medium">{t("macros")}</p>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="rounded-lg border border-border/70 p-2">
                      <p className="text-xs text-muted-foreground">{t("protein")}</p>
                      <p className="font-medium tabular-nums">{t("grams", { g: macro.protein })}</p>
                    </div>
                    <div className="rounded-lg border border-border/70 p-2">
                      <p className="text-xs text-muted-foreground">{t("carbs")}</p>
                      <p className="font-medium tabular-nums">{t("grams", { g: macro.carbs })}</p>
                    </div>
                    <div className="rounded-lg border border-border/70 p-2">
                      <p className="text-xs text-muted-foreground">{t("fat")}</p>
                      <p className="font-medium tabular-nums">{t("grams", { g: macro.fat })}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("completeProfile")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>{t("recTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { title: t("recExercise"), icon: Dumbbell, items: recExercise, color: "text-task" },
              { title: t("recDiet"), icon: Apple, items: recDiet, color: "text-finance" },
              { title: t("recLifestyle"), icon: HeartPulse, items: recLifestyle, color: "text-mind" },
            ].map((col) => (
              <div key={col.title} className="space-y-2">
                <div className={`flex items-center gap-2 font-medium ${col.color}`}>
                  <col.icon className="size-4" /> {col.title}
                </div>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {col.items.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-current opacity-40" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weight trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            {t("weightTrend")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t("last30Days")}</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-72 animate-pulse rounded-xl bg-muted" />
          ) : chartData.length < 2 ? (
            <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
              {t("notEnoughData")}
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  {range ? (
                    <ReferenceArea y1={range.min} y2={range.max} fill="var(--viz-good)" fillOpacity={0.1} />
                  ) : null}
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} dy={10} />
                  <YAxis domain={["dataMin - 1", "dataMax + 1"]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                  <Tooltip
                    cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
                    contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--popover)", color: "var(--popover-foreground)" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    name={t("weight")}
                    stroke="var(--primary)"
                    strokeWidth={3}
                    dot={{ r: 3, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {metrics && metrics.length === 0 ? (
        <EmptyState icon={Scale} title={t("noData")} />
      ) : null}

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <Info className="size-3.5" /> {t("disclaimer")}
      </p>

      <BodyMetricDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
