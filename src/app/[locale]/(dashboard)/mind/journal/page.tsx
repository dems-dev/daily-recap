"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function JournalPage() {
  const t = useTranslations("Navigation");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">{t("journal")}</h1>
        <Button className="gap-2"><Plus className="h-4 w-4" /> New Entry</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 h-[calc(100vh-200px)]">
        <Card className="col-span-1 overflow-y-auto">
          <CardHeader><CardTitle>History</CardTitle></CardHeader>
          <CardContent>
            <div className="text-center p-8 text-muted-foreground">No journal entries.</div>
          </CardContent>
        </Card>
        <Card className="col-span-2">
          <CardHeader><CardTitle>Editor</CardTitle></CardHeader>
          <CardContent>
            <div className="text-center p-8 text-muted-foreground">Select an entry or create a new one.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
