"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function GoalsPage() {
  const t = useTranslations("Navigation");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">{t("goals")}</h1>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Add Goal</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Short-Term Goals</CardTitle></CardHeader>
          <CardContent>
            <div className="text-center p-8 text-muted-foreground">No short-term goals.</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Long-Term Goals</CardTitle></CardHeader>
          <CardContent>
            <div className="text-center p-8 text-muted-foreground">No long-term goals.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
