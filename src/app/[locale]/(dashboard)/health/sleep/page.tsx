"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function SleepPage() {
  const t = useTranslations("Navigation");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">{t("sleep")}</h1>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Log Sleep</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Sleep Log</CardTitle></CardHeader>
          <CardContent>
            <div className="text-center p-8 text-muted-foreground">No sleep records.</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Weekly Average</CardTitle></CardHeader>
          <CardContent>
            <div className="text-center p-8 text-muted-foreground">Chart placeholder</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
