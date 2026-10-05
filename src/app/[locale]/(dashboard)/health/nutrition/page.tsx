"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Droplet, Plus, Minus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader, useFailureToast } from "@/components/common";
import { useJson, sendJson, useInvalidate } from "@/hooks/use-json";
import type { WaterLogDTO } from "@/lib/water";

export default function NutritionPage() {
  const t = useTranslations("Nutrition");
  const { data: log, loading } = useJson<WaterLogDTO>("/api/water");
  const invalidate = useInvalidate();
  const onFail = useFailureToast();
  const [updating, setUpdating] = useState(false);

  const updateGlasses = async (delta: number) => {
    if (!log) return;
    const newCount = Math.max(0, log.glasses + delta);
    if (newCount === log.glasses) return;

    setUpdating(true);
    try {
      await sendJson("/api/water", "PUT", { date: log.date, glasses: newCount, target: log.target });
      invalidate();
    } catch (err) {
      onFail(err);
    } finally {
      setUpdating(false);
    }
  };

  const glasses = log?.glasses ?? 0;
  const target = log?.target ?? 8;
  const percent = Math.min(100, Math.round((glasses / target) * 100));

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplet className="h-5 w-5 text-blue-500" />
              {t("waterTitle")}
            </CardTitle>
            <CardDescription>{t("waterDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {loading ? (
              <div className="h-40 animate-pulse rounded-xl bg-muted" />
            ) : (
              <>
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="text-5xl font-bold tracking-tighter">
                    {glasses} <span className="text-2xl text-muted-foreground font-normal">/ {target}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{t("glassesToday")}</p>
                </div>

                <div className="space-y-2">
                  <div className="h-4 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-blue-500 transition-all duration-500 ease-out"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="text-center text-xs text-muted-foreground">{percent}% of daily goal</p>
                </div>

                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-full"
                    onClick={() => updateGlasses(-1)}
                    disabled={updating || glasses === 0}
                  >
                    <Minus className="h-5 w-5" />
                  </Button>
                  <Button
                    size="icon"
                    className="h-16 w-16 rounded-full bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/20"
                    onClick={() => updateGlasses(1)}
                    disabled={updating}
                  >
                    <Plus className="h-8 w-8" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
