"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function SkillsPage() {
  const t = useTranslations("Navigation");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">{t("skills")}</h1>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Add Skill</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="col-span-3">
          <CardHeader><CardTitle>My Skills</CardTitle></CardHeader>
          <CardContent>
            <div className="text-center p-8 text-muted-foreground">No skills tracked.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
