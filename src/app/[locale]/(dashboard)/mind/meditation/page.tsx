"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function MeditationPage() {
  const t = useTranslations("Navigation");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">{t("meditation")}</h1>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Log Session</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Meditation Sessions</CardTitle></CardHeader>
          <CardContent>
            <div className="text-center p-8 text-muted-foreground">No sessions logged.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
