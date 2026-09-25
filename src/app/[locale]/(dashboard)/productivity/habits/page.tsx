"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function HabitsPage() {
  const t = useTranslations("Navigation");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">{t("habits")}</h1>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Add Habit</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader><CardTitle>Daily Habits</CardTitle></CardHeader>
          <CardContent>
            <div className="text-center p-8 text-muted-foreground">No habits defined.</div>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardHeader><CardTitle>Annual Heatmap</CardTitle></CardHeader>
          <CardContent>
            <div className="text-center p-8 text-muted-foreground">Heatmap placeholder</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
