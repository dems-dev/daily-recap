"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Droplet, Plus, Minus, Utensils, Trash2, Flame } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, ConfirmDialog, useFailureToast } from "@/components/common";
import { EmptyState } from "@/components/ui/empty-state";
import { useJson, sendJson, useInvalidate } from "@/hooks/use-json";
import type { WaterLogDTO } from "@/lib/water";
import { type MealDTO, MEAL_TYPES, type MealType } from "@/lib/meals";
import type { BodyMetricDTO } from "@/lib/body-metrics";
import { todayKey } from "@/lib/date";
import {
  bmi as calcBmi,
  bmiCategory,
  goalForCategory,
  bmr as calcBmr,
  tdee as calcTdee,
  targetCalories,
  ageFromBirthYear,
  type Sex,
  type ActivityLevel,
  type Goal,
} from "@/lib/body-insights";

const PROFILE_KEY = "dr.body.profile";
type Profile = { sex?: Sex; birthYear?: number; activity?: ActivityLevel; target?: number };
const SELECT_CLASS =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function num(v: string): number | null {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export default function NutritionPage() {
  const t = useTranslations("Nutrition");
  const tc = useTranslations("Common");
  const invalidate = useInvalidate();
  const onFail = useFailureToast();

  const { data: water } = useJson<WaterLogDTO>("/api/water");
  const { data: mealsData } = useJson<{ meals: MealDTO[] }>("/api/meals");
  const { data: bodyData } = useJson<{ metrics: BodyMetricDTO[] }>("/api/body");

  const [updating, setUpdating] = useState(false);

  // Meal dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mType, setMType] = useState<MealType>("breakfast");
  const [mName, setMName] = useState("");
  const [mCal, setMCal] = useState("");
  const [mPro, setMPro] = useState("");
  const [mCarb, setMCarb] = useState("");
  const [mFat, setMFat] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Body profile (device-only) to derive the calorie target.
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

  const updateGlasses = async (delta: number) => {
    if (!water) return;
    const newCount = Math.max(0, water.glasses + delta);
    if (newCount === water.glasses) return;
    setUpdating(true);
    try {
      await sendJson("/api/water", "PUT", { date: water.date, glasses: newCount, target: water.target });
      invalidate();
    } catch (err) {
      onFail(err);
    } finally {
      setUpdating(false);
    }
  };

  const glasses = water?.glasses ?? 0;
  const waterTarget = water?.target ?? 8;
  const waterPercent = Math.min(100, Math.round((glasses / waterTarget) * 100));

  const meals = mealsData?.meals ?? [];
  const totalCal = meals.reduce((s, m) => s + (m.calories ?? 0), 0);
  const totalPro = meals.reduce((s, m) => s + (m.protein ?? 0), 0);
  const totalCarb = meals.reduce((s, m) => s + (m.carbs ?? 0), 0);
  const totalFat = meals.reduce((s, m) => s + (m.fat ?? 0), 0);

  // Calorie target from the Body Metrics profile.
  const calTarget = useMemo(() => {
    const metrics = bodyData?.metrics ?? [];
    const latest = metrics[0];
    const weight = latest?.weight ?? null;
    let height: number | null = null;
    for (const m of metrics) if (m.height) { height = m.height; break; }
    const age = profile.birthYear ? ageFromBirthYear(profile.birthYear) : null;
    if (!weight || !height || !profile.sex || !age || !profile.activity) return null;
    let goal: Goal;
    if (profile.target) goal = weight > profile.target + 0.5 ? "lose" : weight < profile.target - 0.5 ? "gain" : "maintain";
    else goal = goalForCategory(bmiCategory(calcBmi(weight, height)));
    return Math.round(targetCalories(calcTdee(calcBmr(profile.sex, weight, height, age), profile.activity), goal));
  }, [bodyData, profile]);

  const resetMeal = () => {
    setMName("");
    setMCal("");
    setMPro("");
    setMCarb("");
    setMFat("");
  };

  const saveMeal = async () => {
    if (!mName.trim()) return;
    setSaving(true);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      await sendJson("/api/meals", "POST", {
        type: mType,
        name: mName.trim(),
        calories: mCal ? Math.round(num(mCal) ?? 0) : null,
        protein: num(mPro),
        carbs: num(mCarb),
        fat: num(mFat),
        date: todayKey(tz),
      });
      resetMeal();
      setDialogOpen(false);
      invalidate();
    } catch (err) {
      onFail(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")}>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 size-4" /> {t("addMeal")}
        </Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Water */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplet className="size-5 text-blue-500" />
              {t("waterTitle")}
            </CardTitle>
            <CardDescription>{t("waterDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center">
              <div className="text-5xl font-bold tracking-tighter tabular-nums">
                {glasses} <span className="text-2xl font-normal text-muted-foreground">/ {waterTarget}</span>
              </div>
              <p className="text-sm text-muted-foreground">{t("glassesToday")}</p>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${waterPercent}%` }} />
              </div>
              <p className="text-center text-xs text-muted-foreground">{t("waterGoal", { percent: waterPercent })}</p>
            </div>
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" size="icon" className="size-12 rounded-full" onClick={() => updateGlasses(-1)} disabled={updating || glasses === 0}>
                <Minus className="size-5" />
              </Button>
              <Button size="icon" className="size-16 rounded-full bg-blue-500 shadow-lg shadow-blue-500/20 hover:bg-blue-600" onClick={() => updateGlasses(1)} disabled={updating}>
                <Plus className="size-8" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Calories */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="size-5 text-finance" />
              {t("totalToday")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-2">
              <span className="font-heading text-4xl font-bold tabular-nums">{totalCal}</span>
              <span className="pb-1 text-sm text-muted-foreground">
                {calTarget ? t("ofTarget", { target: calTarget }) : t("kcal")}
              </span>
            </div>
            {calTarget ? (
              <>
                <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-finance transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round((totalCal / calTarget) * 100))}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {totalCal <= calTarget ? t("remaining", { n: calTarget - totalCal }) : t("over", { n: totalCal - calTarget })}
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">{t("setTargetHint")}</p>
            )}
            <div className="grid grid-cols-3 gap-2 pt-1 text-center text-sm">
              <div className="rounded-lg border border-border/70 p-2">
                <p className="text-xs text-muted-foreground">{t("protein")}</p>
                <p className="font-medium tabular-nums">{Math.round(totalPro)} g</p>
              </div>
              <div className="rounded-lg border border-border/70 p-2">
                <p className="text-xs text-muted-foreground">{t("carbs")}</p>
                <p className="font-medium tabular-nums">{Math.round(totalCarb)} g</p>
              </div>
              <div className="rounded-lg border border-border/70 p-2">
                <p className="text-xs text-muted-foreground">{t("fat")}</p>
                <p className="font-medium tabular-nums">{Math.round(totalFat)} g</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meals list */}
      <Card>
        <CardHeader>
          <CardTitle>{t("mealsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {meals.length === 0 ? (
            <EmptyState
              icon={Utensils}
              title={t("noMeals")}
              action={
                <Button size="sm" variant="outline" className="gap-1.5 rounded-full" onClick={() => setDialogOpen(true)}>
                  <Plus className="size-4" /> {t("addMeal")}
                </Button>
              }
            />
          ) : (
            <div className="space-y-5">
              {MEAL_TYPES.filter((mt) => meals.some((m) => m.type === mt)).map((mt) => (
                <div key={mt}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t(`types.${mt}`)}</p>
                  <ul className="space-y-2">
                    {meals.filter((m) => m.type === mt).map((m) => (
                      <li key={m.id} className="flex items-center gap-3 rounded-xl border border-border/70 p-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-finance/12 text-finance">
                          <Utensils className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{m.name}</p>
                          {m.protein || m.carbs || m.fat ? (
                            <p className="text-xs text-muted-foreground tabular-nums">
                              P {Math.round(m.protein ?? 0)} · C {Math.round(m.carbs ?? 0)} · F {Math.round(m.fat ?? 0)}
                            </p>
                          ) : null}
                        </div>
                        <span className="shrink-0 text-sm font-medium tabular-nums">
                          {m.calories ?? 0} <span className="text-xs text-muted-foreground">{t("kcal")}</span>
                        </span>
                        <Button variant="ghost" size="icon-sm" onClick={() => setDeletingId(m.id)} aria-label={tc("delete")}>
                          <Trash2 className="size-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add meal dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addMeal")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="meal-type">{t("mealType")}</Label>
                <select id="meal-type" value={mType} onChange={(e) => setMType(e.target.value as MealType)} className={SELECT_CLASS}>
                  {MEAL_TYPES.map((mt) => (
                    <option key={mt} value={mt}>
                      {t(`types.${mt}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="meal-cal">
                  {t("calories")} <span className="text-muted-foreground">({t("optional")})</span>
                </Label>
                <Input id="meal-cal" type="number" min={0} value={mCal} onChange={(e) => setMCal(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meal-name">{t("mealName")}</Label>
              <Input id="meal-name" autoFocus value={mName} onChange={(e) => setMName(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="meal-pro">{t("protein")}</Label>
                <Input id="meal-pro" type="number" min={0} value={mPro} onChange={(e) => setMPro(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meal-carb">{t("carbs")}</Label>
                <Input id="meal-carb" type="number" min={0} value={mCarb} onChange={(e) => setMCarb(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meal-fat">{t("fat")}</Label>
                <Input id="meal-fat" type="number" min={0} value={mFat} onChange={(e) => setMFat(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button onClick={saveMeal} disabled={saving || !mName.trim()}>
              {tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deletingId !== null}
        onOpenChange={(o) => !o && setDeletingId(null)}
        title={t("deleteMealTitle")}
        description={t("deleteMealDesc")}
        onConfirm={async () => {
          if (!deletingId) return;
          try {
            await sendJson(`/api/meals/${deletingId}`, "DELETE");
            invalidate();
          } catch (err) {
            onFail(err);
          }
        }}
      />
    </div>
  );
}
