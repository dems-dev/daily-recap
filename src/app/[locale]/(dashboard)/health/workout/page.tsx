"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function WorkoutPage() {
  const t = useTranslations("Navigation");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">{t("workout")}</h1>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Log Workout</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader><CardTitle>Recent Workouts</CardTitle></CardHeader>
          <CardContent>
            <div className="text-center p-8 text-muted-foreground">No workouts logged yet.</div>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardHeader><CardTitle>Templates</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start">Push</Button>
              <Button variant="outline" className="w-full justify-start">Pull</Button>
              <Button variant="outline" className="w-full justify-start">Legs</Button>
              <Button variant="outline" className="w-full justify-start">Cardio</Button>
              <Button variant="outline" className="w-full justify-start">Full Body</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
