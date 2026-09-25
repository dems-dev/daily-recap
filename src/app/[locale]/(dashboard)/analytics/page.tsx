"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AnalyticsPage() {
  const t = useTranslations("Navigation");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">{t("analytics")}</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-4">
          <CardHeader><CardTitle>Weekly Recap</CardTitle></CardHeader>
          <CardContent>
            <div className="text-center p-8 text-muted-foreground bg-muted/20 rounded-lg">
              Auto-Generated Recap Placeholder
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-2">
          <CardHeader><CardTitle>Life Balance Chart</CardTitle></CardHeader>
          <CardContent>
            <div className="text-center p-8 text-muted-foreground h-[200px] border border-dashed rounded-lg">
              Radar Chart Placeholder
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-2">
          <CardHeader><CardTitle>Productivity Trend</CardTitle></CardHeader>
          <CardContent>
            <div className="text-center p-8 text-muted-foreground h-[200px] border border-dashed rounded-lg">
              Line Chart Placeholder
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
