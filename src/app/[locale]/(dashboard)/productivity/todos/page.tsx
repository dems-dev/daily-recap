"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function TodosPage() {
  const t = useTranslations("Navigation");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">{t("todos")}</h1>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Add Task</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <Card>
          <CardHeader><CardTitle>Tasks</CardTitle></CardHeader>
          <CardContent>
            <div className="text-center p-8 text-muted-foreground">No tasks today.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
