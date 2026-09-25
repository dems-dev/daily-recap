"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PomodoroPage() {
  const t = useTranslations("Navigation");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">{t("pomodoro")}</h1>
      </div>

      <div className="flex justify-center items-center h-[50vh]">
        <Card className="w-full max-w-md text-center">
          <CardHeader><CardTitle>Pomodoro Timer</CardTitle></CardHeader>
          <CardContent className="space-y-8">
            <div className="text-7xl font-bold tabular-nums">25:00</div>
            <div className="space-x-4">
              <Button>Start</Button>
              <Button variant="outline">Reset</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
