"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function TilPage() {
  const t = useTranslations("Navigation");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">{t("til")}</h1>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Add Note</Button>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader><CardTitle>Recent Insights</CardTitle></CardHeader>
          <CardContent>
            <div className="text-center p-8 text-muted-foreground">No Today I Learned (TIL) notes yet.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
